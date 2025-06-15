import { motion } from 'framer-motion'

export const SettingsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Settings
        </h1>
        
        <div className="text-center py-20">
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Settings functionality will be implemented here
          </p>
        </div>
      </motion.div>
    </div>
  )
}
