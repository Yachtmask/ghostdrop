import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Lock, Clock, Ghost, ChevronRight, Download, Key, Zap, Globe } from 'lucide-react';

const LandingPage = () => {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  return (
    <div className="space-y-16 sm:space-y-24 md:space-y-32 pb-12 sm:pb-20 overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-12 sm:pt-16 md:pt-20">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-1/4 left-1/4 w-48 sm:w-64 md:w-96 h-48 sm:h-64 md:h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-48 sm:w-64 md:w-96 h-48 sm:h-64 md:h-96 bg-purple-600/10 rounded-full blur-3xl animate-pulse delay-700" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center space-y-6 sm:space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs sm:text-sm font-medium mb-4"
          >
            <Zap className="w-4 h-4" />
            <span>Powering Digital Sovereignty on Aptos</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-none"
          >
            Secure Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Digital Legacy</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-400 max-w-2xl mx-auto leading-relaxed px-2"
          >
            GhostDrop is the ultimate decentralized Dead Man Switch. Encrypt your most sensitive data locally and store it verifiably on the Shelby network. Your heartbeat keeps it secure. Your silence releases it.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 sm:pt-8"
          >
            <Link 
              to="/create" 
              className="w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg transition-all shadow-2xl shadow-blue-600/20 flex items-center justify-center gap-2 group"
            >
              Create Your First Vault
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a 
              href="#how_it_works" 
              className="w-full sm:w-auto px-6 sm:px-10 py-4 sm:py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg transition-all border border-slate-800 flex items-center justify-center gap-2"
            >
              Learn the Protocol
            </a>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
          {[
            {
              title: "Zero Knowledge Encryption",
              desc: "We use industrial grade AES 256 GCM encryption. Your files are locked on your device before they ever touch the cloud. Your keys never leave your sight.",
              icon: Lock,
              color: "text-blue-400"
            },
            {
              title: "Decentralized Persistence",
              desc: "By leveraging the Shelby protocol on Aptos, your data is distributed across a decentralized global network. It is immutable, verifiable, and always ready.",
              icon: Globe,
              color: "text-purple-400"
            },
            {
              title: "The Heartbeat Protocol",
              desc: "Set your custom check in interval. As long as you are active, your data remains hidden. If the heartbeat stops, the protocol automatically triggers the release.",
              icon: Clock,
              color: "text-green-400"
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              {...fadeInUp}
              transition={{ delay: i * 0.2 }}
              className="p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 hover:border-blue-500/30 transition-all group"
            >
              <div className={`p-4 rounded-2xl bg-slate-950 w-fit mb-6 group-hover:scale-110 transition-transform`}>
                <feature.icon className={`w-8 h-8 ${feature.color}`} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-4">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed text-sm sm:text-base">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how_it_works" className="container mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="bg-slate-900 rounded-2xl sm:rounded-3xl md:rounded-5xl border border-slate-800 overflow-hidden">
          <div className="grid lg:grid-cols-2">
            <div className="p-6 sm:p-8 md:p-12 lg:p-20 space-y-8 sm:space-y-12">
              <div className="space-y-4">
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold">The GhostDrop Lifecycle</h2>
                <p className="text-slate-400 text-base sm:text-lg">A seamless journey from absolute privacy to guaranteed delivery.</p>
              </div>

              <div className="space-y-8 sm:space-y-10">
                {[
                  { step: "01", title: "Encrypt and Upload", text: "Select your files and add your trusted recipients. GhostDrop encrypts everything locally and stores the data securely on Shelby using ShelbyUSD." },
                  { step: "02", title: "Maintain the Heartbeat", text: "Simply check in through your dashboard using your Aptos wallet. This resets the timer and keeps your vaults in a secure, locked state." },
                  { step: "03", title: "Automatic Release", text: "If you miss your check in window, the protocol marks the vault as released. Recipients can then use their unique tokens to decrypt and download the data." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 sm:gap-6">
                    <span className="text-3xl sm:text-4xl font-bold text-blue-500/20 flex-shrink-0">{item.step}</span>
                    <div className="space-y-2 min-w-0">
                      <h4 className="text-lg sm:text-xl font-bold">{item.title}</h4>
                      <p className="text-slate-400 leading-relaxed text-sm sm:text-base">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-600 to-purple-700 p-6 sm:p-8 md:p-10 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-full h-full bg-white via-transparent to-transparent" />
              </div>
              <div className="relative z-10 bg-slate-950 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/10 max-w-sm w-full space-y-6">
                <div className="flex items-center justify-between">
                  <Shield className="w-8 h-8 text-blue-400" />
                  <div className="px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-bold uppercase tracking-wider">Active</div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                      animate={{ width: ["100%", "20%", "100%"] }}
                      transition={{ duration: 10, repeat: Infinity }}
                      className="h-full bg-blue-500"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 font-bold uppercase tracking-widest">
                    <span>Secure</span>
                    <span>Release</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                    <span className="text-sm font-bold">Heartbeat Detected</span>
                  </div>
                  <Lock className="w-5 h-5 text-slate-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="container mx-auto px-4 sm:px-6 text-center space-y-12">
        <div className="max-w-3xl mx-auto space-y-4">
          <h2 className="text-3xl sm:text-4xl font-bold">Built for the Long Term</h2>
          <p className="text-slate-400 text-base sm:text-lg leading-relaxed px-2">
            GhostDrop is designed with the philosophy that your data should outlive any single platform. By using decentralized storage and blockchain verification, we ensure your legacy is never at the mercy of a single server or company.
          </p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-6 sm:gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
          <div className="flex items-center gap-3">
            <Ghost className="w-8 h-8" />
            <span className="text-xl sm:text-2xl font-bold tracking-tighter">SHELBY</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8" />
            <span className="text-xl sm:text-2xl font-bold tracking-tighter">APTOS</span>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6">
        <motion.div 
          {...fadeInUp}
          className="p-6 sm:p-8 md:p-12 lg:p-20 rounded-2xl sm:rounded-3xl md:rounded-5xl bg-gradient-to-br from-blue-600 to-purple-700 text-center space-y-6 sm:space-y-8 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 sm:p-12 opacity-10">
            <Lock className="w-32 sm:w-48 md:w-64 h-32 sm:h-48 md:h-64" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">Ready to Secure Your <br /> Digital Future?</h2>
          <p className="text-blue-100 text-base sm:text-lg md:text-xl max-w-xl mx-auto px-2">
            Join the thousands of users who trust GhostDrop for their most sensitive data and legacy planning.
          </p>
          <div className="pt-4">
            <Link 
              to="/create" 
              className="inline-flex items-center gap-3 px-6 sm:px-12 py-4 sm:py-6 bg-white text-blue-600 rounded-xl sm:rounded-2xl font-bold text-base sm:text-xl hover:bg-blue-50 transition-all shadow-2xl"
            >
              Get Started Now
              <ChevronRight className="w-6 h-6" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 sm:px-6 pt-12 sm:pt-20 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-8 text-center md:text-left">
        <div className="flex items-center gap-2">
          <Ghost className="w-6 h-6 text-blue-400" />
          <span className="text-lg sm:text-xl font-bold tracking-tighter">GHOSTDROP</span>
        </div>
        <div className="flex flex-wrap gap-4 sm:gap-8 text-slate-500 text-xs sm:text-sm font-medium justify-center md:justify-start">
          <a href="#" className="hover:text-white transition-colors">Protocol</a>
          <a href="#" className="hover:text-white transition-colors">Security</a>
          <a href="#" className="hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-white transition-colors">Terms</a>
        </div>
        <p className="text-slate-500 text-xs sm:text-sm">
          Built with passion on Aptos Protocol
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
