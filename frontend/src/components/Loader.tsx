import React from 'react';
import { motion } from 'framer-motion';

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <motion.div
        className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <p className="mt-4 text-gray-600 text-sm">Analyzing your resume and job match...</p>
    </div>
  );
};

export default Loader;