"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { ParallaxElement } from "@/components/ParallaxElement";
import { 
  Search, Youtube, Newspaper, Globe, TrendingUp, 
  AlertCircle, FileText, Sparkles, Zap, Users, ArrowRight, Radio
} from "lucide-react";

const allAgents = [
  {
    id: "seo",
    name: "SEO Agent",
    description: "Generate SEO-optimized meta titles, descriptions, and content strategies",
    icon: Search,
    gradient: "from-blue-500 to-cyan-500",
    stats: { accuracy: "98%", speed: "< 2s" }
  },
  {
    id: "youtube",
    name: "YouTube Agent",
    description: "Search and analyze YouTube videos with advanced AI insights",
    icon: Youtube,
    gradient: "from-red-500 to-pink-500",
    stats: { accuracy: "95%", speed: "< 3s" }
  },
  {
    id: "forbes",
    name: "Forbes Agent",
    description: "Search and analyze Forbes articles with deep content analysis",
    icon: Newspaper,
    gradient: "from-purple-500 to-indigo-500",
    stats: { accuracy: "97%", speed: "< 2s" }
  },
  {
    id: "web_search",
    name: "Web Search Agent",
    description: "Search the web for latest AI news and comprehensive information",
    icon: Globe,
    gradient: "from-green-500 to-emerald-500",
    stats: { accuracy: "96%", speed: "< 3s" }
  },
  {
    id: "daily_news_collector",
    name: "Daily News Collector",
    description: "Monitor and collect daily news across multiple topics automatically",
    icon: TrendingUp,
    gradient: "from-orange-500 to-yellow-500",
    stats: { accuracy: "99%", speed: "Real-time" }
  },
  {
    id: "breaking_news_alert",
    name: "Breaking News Alert",
    description: "Real-time alerts for breaking and high-impact news events",
    icon: AlertCircle,
    gradient: "from-red-600 to-rose-600",
    stats: { accuracy: "99%", speed: "< 1s" }
  },
  {
    id: "news_research",
    name: "News Research Agent",
    description: "Deep research on topics with multi-source comprehensive analysis",
    icon: FileText,
    gradient: "from-indigo-500 to-purple-500",
    stats: { accuracy: "98%", speed: "< 5s" }
  },
  {
    id: "news_summarizer",
    name: "News Summarizer",
    description: "Create concise TLDR summaries of news content instantly",
    icon: Sparkles,
    gradient: "from-pink-500 to-rose-500",
    stats: { accuracy: "97%", speed: "< 2s" }
  },
  {
    id: "multi_agent_newsroom",
    name: "Multi-Agent Newsroom",
    description: "Coordinate multiple agents for complete news processing workflow",
    icon: Users,
    gradient: "from-purple-600 to-indigo-600",
    stats: { accuracy: "99%", speed: "Automated" }
  },
  {
    id: "ultimate_ai_news",
    name: "Ultimate AI News Agent",
    description: "All-in-one comprehensive news agent with all premium features",
    icon: Zap,
    gradient: "from-blue-600 to-purple-600",
    stats: { accuracy: "99%", speed: "Real-time" }
  },
  {
    id: "live_news",
    name: "Live News Agent",
    description: "Real-time news updates with live feed monitoring and breaking news alerts",
    icon: Radio,
    gradient: "from-red-600 to-orange-600",
    stats: { accuracy: "99%", speed: "Live" }
  },
];

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-[#030014] relative overflow-hidden">
      <Navbar />
      {/* Background with Parallax */}
      <div className="fixed inset-0 bg-pattern opacity-30" />
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <ParallaxElement speed={0.3} direction="both">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-3xl bg-purple-600/10" />
        </ParallaxElement>
        <ParallaxElement speed={0.4} direction="both">
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full blur-3xl bg-cyan-600/10" />
        </ParallaxElement>
      </div>

      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-24 relative z-10">
        {/* Header */}
        <ParallaxElement speed={0.1} direction="vertical">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-premium border border-white/10 mb-5"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#6366f1]" />
              <span className="text-xs text-white/90 font-medium">12 Premium AI Agents</span>
            </motion.div>
            
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              <span className="gradient-text">All AI Agents</span>
            </h1>
            
            <p className="text-base md:text-lg text-white/60 max-w-2xl mx-auto">
              Choose an agent to start a conversation and get AI-powered news insights instantly
            </p>
          </motion.div>
        </ParallaxElement>

        {/* Agents Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {allAgents.map((agent, index) => {
            const Icon = agent.icon;
            return (
              <ParallaxElement key={agent.id} speed={0.2 + (index * 0.05)} direction="both">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.5 }}
                  whileHover={{ y: -8 }}
                >
                  <Link href={`/agents/${agent.id}`}>
                    <div className="card-premium glass-strong rounded-xl p-5 h-full border border-white/10 relative overflow-hidden">
                      {/* Hover Gradient */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${agent.gradient} opacity-0 hover:opacity-5 transition-opacity duration-500`} />
                      
                      <div className="relative z-10">
                        {/* Icon */}
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          className={`w-12 h-12 rounded-lg bg-gradient-to-br ${agent.gradient} p-2.5 mb-3.5`}
                        >
                          <Icon className="w-full h-full text-white" />
                        </motion.div>

                        {/* Title */}
                        <h3 className="text-lg font-bold text-white mb-2 hover:gradient-text transition-all">
                          {agent.name}
                        </h3>

                        {/* Description */}
                        <p className="text-white/60 text-sm leading-relaxed mb-3.5 min-h-[50px]">
                          {agent.description}
                        </p>

                        {/* Stats */}
                        <div className="flex items-center gap-2.5 mb-3.5 pb-3.5 border-b border-white/5">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="text-[10px] text-white/50">{agent.stats.accuracy}</span>
                          </div>
                          <div className="w-1 h-1 rounded-full bg-white/20" />
                          <span className="text-[10px] text-white/50">{agent.stats.speed}</span>
                        </div>

                        {/* CTA */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-[#6366f1] hover:text-[#8b5cf6] transition-colors">
                            Start Chat
                          </span>
                          <motion.div
                            whileHover={{ x: 5 }}
                            className="w-7 h-7 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 flex items-center justify-center hover:bg-[#6366f1]/20 hover:border-[#6366f1]/40 transition-all"
                          >
                            <ArrowRight className="w-3.5 h-3.5 text-[#6366f1]" />
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              </ParallaxElement>
            );
          })}
        </div>
      </div>
    </div>
  );
}
