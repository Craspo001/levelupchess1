'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Sword, Library, Bot, ArrowRight, Play } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const features = [
    {
      title: 'Interactive Training',
      description: 'Master openings through active recall and spaced repetition drills.',
      icon: <Sword className="w-6 h-6 text-blue-500" />,
    },
    {
      title: 'Opening Library',
      description: 'Explore thousands of lines with engine evaluations and master games.',
      icon: <Library className="w-6 h-6 text-purple-500" />,
    },
    {
      title: 'AI Coach',
      description: 'Get personalized feedback on your repertoire and find your weaknesses.',
      icon: <Bot className="w-6 h-6 text-emerald-500" />,
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl"
      >
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white mb-6">
          Level Up Your <span className="text-blue-600 dark:text-blue-400">Chess Openings</span>
        </h1>
        <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-400 mb-10">
          Train Smarter. Play Stronger.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
          <Link href="/train" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 group">
            <Play className="w-5 h-5 fill-current" />
            Start Training
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <button className="px-8 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
            Explore Openings
          </button>
        </div>
      </motion.div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full">
        {features.map((feature, index) => {
          const CardContent = (
            <>
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </>
          );

          const cardClassName = "p-8 bg-white dark:bg-slate-900 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 text-left hover:shadow-md transition-shadow block h-full";

          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
            >
              {feature.title === 'Interactive Training' ? (
                <Link href="/train" className={cardClassName}>
                  {CardContent}
                </Link>
              ) : (
                <div className={cardClassName}>
                  {CardContent}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Footer / Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-20 text-slate-400 dark:text-slate-600 text-sm font-medium tracking-widest uppercase"
      >
        LevelUpChess &copy; 2026
      </motion.div>
    </main>
  );
}
