"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import { motion, useAnimation } from "motion/react";
import { auth, db } from "@/lib/firebase";
import ErrorBoundary from "@/components/ErrorBoundary";
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from "firebase/auth";
import { 
  doc, 
  onSnapshot, 
  setDoc, 
  getDocFromServer,
  Timestamp
} from "firebase/firestore";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function TrainPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [pgn, setPgn] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("chess-train-pgn") || "";
    }
    return "";
  });

  const [fen, setFen] = useState(() => {
    if (typeof window !== "undefined") {
      const savedPgn = localStorage.getItem("chess-train-pgn");
      if (savedPgn) {
        try {
          const testGame = new Chess();
          testGame.loadPgn(savedPgn);
          return testGame.fen();
        } catch (e) {
          console.error("Failed to load saved game FEN", e);
        }
      }
    }
    return "start";
  });

  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [illegalMoveSquares, setIllegalMoveSquares] = useState<Record<string, any>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const controls = useAnimation();

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
      
      if (currentUser) {
        // Sync user profile
        const userRef = doc(db, 'users', currentUser.uid);
        setDoc(userRef, {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}`));
      }
    });
    return () => unsubscribe();
  }, []);

  // Validate connection to Firestore
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if(error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

  // Firestore sync listener
  useEffect(() => {
    if (!user || !isAuthReady) return;

    const sessionRef = doc(db, 'trainingSessions', user.uid);
    const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.pgn !== pgn) {
          setPgn(data.pgn);
          setFen(data.fen);
          if (typeof window !== "undefined") {
            localStorage.setItem("chess-train-pgn", data.pgn);
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `trainingSessions/${user.uid}`);
    });

    return () => unsubscribe();
  }, [user, isAuthReady, pgn]);

  // Local storage persistence
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (pgn) {
        localStorage.setItem("chess-train-pgn", pgn);
      } else {
        localStorage.removeItem("chess-train-pgn");
      }
    }
  }, [pgn]);

  const syncToFirestore = async (newPgn: string, newFen: string) => {
    if (!user) return;
    
    setIsSyncing(true);
    try {
      const sessionRef = doc(db, 'trainingSessions', user.uid);
      await setDoc(sessionRef, {
        uid: user.uid,
        pgn: newPgn,
        fen: newFen,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `trainingSessions/${user.uid}`);
    } finally {
      setIsSyncing(false);
    }
  };

  async function login() {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  }

  async function logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  }

  function makeMove(move: any) {
    try {
      const gameCopy = new Chess();
      gameCopy.loadPgn(pgn);
      const result = gameCopy.move(move);

      if (result) {
        const newFen = gameCopy.fen();
        const newPgn = gameCopy.pgn();
        setFen(newFen);
        setPgn(newPgn);
        syncToFirestore(newPgn, newFen);
        return true;
      }
      
      triggerIllegalMoveFeedback(move.from, move.to);
      return false;
    } catch (e) {
      triggerIllegalMoveFeedback(move.from, move.to);
      return false;
    }
  }

  async function triggerIllegalMoveFeedback(from: string, to: string) {
    // Shake animation
    controls.start({
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 }
    });

    // Highlight squares in red
    setIllegalMoveSquares({
      [from]: { backgroundColor: "rgba(255, 0, 0, 0.4)" },
      [to]: { backgroundColor: "rgba(255, 0, 0, 0.4)" },
    });

    // Clear highlights after a short delay
    setTimeout(() => {
      setIllegalMoveSquares({});
    }, 500);
  }

  function onDrop(sourceSquare: string, targetSquare: string) {
    return makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: "q",
    });
  }

  function resetBoard() {
    setFen("start");
    setPgn("");
    setIllegalMoveSquares({});
    if (typeof window !== "undefined") {
      localStorage.removeItem("chess-train-pgn");
    }
    syncToFirestore("", "start");
  }

  function flipBoard() {
    setBoardOrientation((prev) => (prev === "white" ? "black" : "white"));
  }

  const ChessboardAny = Chessboard as any;
  const game = new Chess();
  game.loadPgn(pgn);
  const history = game.history();

  return (
    <ErrorBoundary>
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4 bg-slate-50">
        <div className="w-full max-w-4xl flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Training Board</h1>
        
        <div className="flex items-center gap-4">
          {isSyncing && <span className="text-xs text-slate-400 animate-pulse">Syncing...</span>}
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-700">{user.displayName}</p>
                <p className="text-xs text-slate-500">Cloud Sync Active</p>
              </div>
              {user.photoURL && (
                <Image 
                  src={user.photoURL} 
                  alt="Profile" 
                  width={32} 
                  height={32} 
                  className="rounded-full border border-slate-200" 
                  referrerPolicy="no-referrer"
                />
              )}
              <button 
                onClick={logout}
                className="text-xs text-slate-500 hover:text-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={login}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 transition-colors text-sm font-medium text-slate-700"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Login to Sync
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start w-full max-w-4xl">
        <div className="flex-1 flex flex-col items-center gap-6">
          <motion.div 
            animate={controls}
            className="w-full max-w-md shadow-2xl rounded-lg overflow-hidden border-4 border-white"
          >
            <ChessboardAny
              position={fen}
              onPieceDrop={onDrop}
              boardOrientation={boardOrientation}
              customSquareStyles={illegalMoveSquares}
              animationDuration={200}
            />
          </motion.div>

          <div className="flex gap-4">
            <button
              onClick={resetBoard}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors"
            >
              Reset Board
            </button>

            <button
              onClick={flipBoard}
              className="px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-md transition-colors"
            >
              Flip Board
            </button>
          </div>

          <div className="text-slate-600 italic">
            {game.isCheck() && <span className="text-red-600 font-bold">Check!</span>}
            {game.isCheckmate() && <span className="text-red-600 font-bold">Checkmate!</span>}
            {game.isDraw() && <span className="text-amber-600 font-bold">Draw!</span>}
          </div>
        </div>

        <div className="w-full lg:w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-4 flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-700 border-b pb-2">Move History</h2>
          <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto pr-2">
            {history.length === 0 ? (
              <p className="text-slate-400 italic text-sm">No moves yet</p>
            ) : (
              history.map((move, index) => (
                <div 
                  key={index} 
                  className={`px-2 py-1 rounded text-sm font-mono ${
                    index % 2 === 0 ? 'bg-slate-100 text-slate-700' : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {index % 2 === 0 && <span className="text-slate-400 mr-1">{Math.floor(index / 2) + 1}.</span>}
                  {move}
                </div>
              ))
            )}
          </div>
        </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
