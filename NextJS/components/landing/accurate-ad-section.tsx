"use client";

import { motion, cubicBezier } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { FaTiktok, FaReddit, FaCommentDots, FaGoogle, FaFacebook, FaBolt, FaChartBar, FaNewspaper } from 'react-icons/fa';
import { SiAdobe, SiCanva, SiGoogleads, SiMeta } from 'react-icons/si';
import { ChartBar, CloudLightningIcon, Phone, SmartphoneCharging } from "lucide-react";
import { BorderBeam } from "@/components/magicui/border-beam";
import OrbitingCircles from "@/components/magicui/orbiting-circles";
import { FaThreads } from "react-icons/fa6";

const adSteps = [
  {
    title: "Get real-time insights",
    description: "Lightspeed aggregates voter sentiment from social media and current events, and previously successful ads from Google Ads and Meta Ads.",
    icons: [
      <FaTiktok key="tiktok" className="w-8 h-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400" />,
      <FaReddit key="reddit" className="w-8 h-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400" />,
      <FaCommentDots key="comment-dots" className="w-8 h-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400" />,
      <SiGoogleads key="googleads" className="w-8 h-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400" />,
      <SiMeta key="meta" className="w-8 h-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400" />
    ],
    displayIcon: <SmartphoneCharging className="w-5 h-5 text-blue-600 dark:text-blue-400" />
  },
  {
    title: "Generate ad copies with AI",
    description: "Lightspeed will generate ad suggestions and variations based on trending topics, successful campaigns, and targeted voter demographics.",
    icons: [
      <CloudLightningIcon key="cloud-lightning" className="w-5 h-5 text-blue-600 dark:text-blue-400" />
    ],
    displayIcon: <CloudLightningIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
  },
  {
    title: "Test and deploy on platform",
    description: "Deploy your ads to Google, Meta, track analytics, and rapidly A/B test directly from Lightspeed.",
    icons: [
      <SiGoogleads key="googleads" className="w-8 h-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400" />,
      <SiMeta key="meta" className="w-8 h-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400" />,
      <FaChartBar key="chart-bar" className="w-8 h-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400" />
    ],
    displayIcon: <ChartBar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
  }
];

export default function AccurateAdSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
  
    return (
      <section ref={ref} className="py-10 px-6 md:px-8 bg-transparent dark:from-blue-900 dark:to-black">
          <div className="max-w-7xl mx-auto">
          <motion.h3
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-lg font-light tracking-tight text-center mb-3"
          >
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            ENTER <CloudLightningIcon className="inline-block text-blue-500 dark:text-blue-400" /> LIGHTSPEED
            </span>
          </motion.h3>
          <motion.h2 
            initial={{ opacity: 0, y: -20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-center mb-8 sm:mb-16"
          >
            <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
              Political advertising has never been more integrated & accurate.
            </span>
          </motion.h2>
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="relative flex h-[300px] sm:h-[420px] w-full lg:w-1/2 flex-col items-center justify-center overflow-hidden rounded-lg border bg-background md:shadow-xl">
              <span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-blue-600 to-blue-400 bg-clip-text text-center text-3xl sm:text-4xl py-3 font-medium leading-none text-transparent dark:from-white dark:to-black">
                <CloudLightningIcon className="w-8 h-8 sm:w-12 sm:h-12 text-blue-500 dark:text-blue-400" />
              </span>

              <OrbitingCircles
                className="size-[30px] sm:size-[40px] border-none bg-transparent"
                duration={20}
                delay={15}
                radius={80}
                reverse
              >
                {<SiAdobe className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />}
              </OrbitingCircles>
              <OrbitingCircles
                className="size-[30px] sm:size-[40px] border-none bg-transparent"
                duration={20}
                delay={5}
                radius={80}
                reverse
              >
                {<SiCanva className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />}
              </OrbitingCircles>
              
              {/* Inner Circles */}
              <OrbitingCircles
                className="size-[20px] sm:size-[30px] border-none bg-transparent"
                duration={20}
                delay={20}
                radius={50}
              >
                {<FaTiktok className="w-4 h-4 sm:w-6 sm:h-6 text-gray-500" />}
              </OrbitingCircles>
              <OrbitingCircles
                className="size-[20px] sm:size-[30px] border-none bg-transparent"
                duration={20}
                delay={10}
                radius={50}
              >
                <FaNewspaper className="w-4 h-4 sm:w-6 sm:h-6 text-gray-500" />
              </OrbitingCircles>
              <OrbitingCircles
                className="size-[20px] sm:size-[30px] border-none bg-transparent"
                duration={20}
                delay={5}
                radius={50}
              >
                <FaReddit className="w-4 h-4 sm:w-6 sm:h-6 text-gray-500" />
              </OrbitingCircles>
              <OrbitingCircles
                className="size-[20px] sm:size-[30px] border-none bg-transparent"
                duration={20}
                delay={15}
                radius={50}
              >
                <FaThreads className="w-4 h-4 sm:w-6 sm:h-6 text-gray-500" />
              </OrbitingCircles>
    
              {/* Outer Circles (reverse) */}
              <OrbitingCircles
                className="size-[40px] sm:size-[50px] border-none bg-transparent"
                radius={120}
                duration={20}
                reverse
              >
                <FaGoogle className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
              </OrbitingCircles>
              <OrbitingCircles
                className="size-[40px] sm:size-[50px] border-none bg-transparent"
                radius={120}
                duration={20}
                delay={20}
                reverse
              >
                <FaFacebook className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500" />
              </OrbitingCircles>
            </div>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col gap-4 sm:gap-6 w-full lg:w-1/2"
            >
              {adSteps.map((step, index) => (
                <AdStepCard key={step.title} step={step} index={index} />
              ))}
            </motion.div>
          </div>
        </div>
      </section>
    );
  }
  
  function AdStepCard({ step, index }: { step: typeof adSteps[number], index: number }) {
    return (
        <div className="flex items-start space-x-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900">
            {step.displayIcon}
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">{step.title}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{step.description}</p>
        </div>
      </div>
    );
  }