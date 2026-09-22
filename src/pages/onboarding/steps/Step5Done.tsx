import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Palette } from 'lucide-react'
import type { OnboardingData } from '../Onboarding'

interface Props {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  onComplete?: () => void
}

export default function Step5Done(_: Props) {
  useEffect(() => {
    document.title = 'Setup Complete - VisualFlow AI'
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4 },
    },
  }

  return (
    <div className="w-full space-y-8 md:space-y-10">
      {/* Header with Checkmark */}
      <div className="flex flex-col items-center text-center">
        {/* Animated Checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 25,
            delay: 0.1,
          }}
          className="relative mb-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear',
            }}
            className="absolute inset-0 bg-linear-to-r from-brand-500 to-amber-500 rounded-full opacity-20 blur-xl"
          />
          <div className="relative w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center border-2 border-emerald-200">
            <motion.svg
              viewBox="0 0 24 24"
              className="w-10 h-10 text-emerald-600"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <motion.path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-3 max-w-md"
        >
          <motion.div variants={itemVariants}>
            <h2 className="font-display font-bold text-zinc-900 text-3xl md:text-4xl">
              You're all set! 🚀
            </h2>
          </motion.div>
          <motion.div variants={itemVariants}>
            <p className="text-lg text-zinc-600">
              VisualFlow AI is now your social media team
            </p>
          </motion.div>
        </motion.div>
      </div>

      {/* Summary Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full"
      >
        <motion.div
          variants={itemVariants}
          className="bg-blue-50 border border-blue-200 rounded-2xl p-6 flex flex-col items-center gap-2"
        >
          <div className="text-2xl">📅</div>
          <p className="text-sm font-semibold text-zinc-900">First post</p>
          <p className="text-xs text-zinc-600">generating now...</p>
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="bg-purple-50 border border-purple-200 rounded-2xl p-6 flex flex-col items-center gap-2"
        >
          <Palette className="w-6 h-6 text-brand-600" />
          <p className="text-sm font-semibold text-zinc-900">Brand style</p>
          <p className="text-xs text-zinc-600">confirmed</p>
        </motion.div>
        <motion.div
          variants={itemVariants}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex flex-col items-center gap-2"
        >
          <div className="text-2xl">🎊</div>
          <p className="text-sm font-semibold text-zinc-900">Campaigns</p>
          <p className="text-xs text-zinc-600">ready to go</p>
        </motion.div>
      </motion.div>

      {/* What Happens Next */}
      <div>
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="mb-4"
        >
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            What happens next
          </p>
        </motion.div>

        <motion.div
          className="space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            { icon: '🛍️', text: 'Products syncing from your Shopify store' },
            { icon: '✨', text: 'First content batch generating (ready in ~2 min)' },
            { icon: '⚡', text: 'Autopilot activated and running' },
            { icon: '🔔', text: 'You\'ll get a notification when first post is ready' },
          ].map((item, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="flex items-start gap-4 bg-zinc-50 rounded-xl p-4 border border-zinc-100"
            >
              <span className="text-xl shrink-0">{item.icon}</span>
              <p className="text-sm text-zinc-700 pt-1">{item.text}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
