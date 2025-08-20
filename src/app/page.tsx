'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  PenTool,
  Layers,
  Share2,
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
  Star,
  Mail,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();

  const handleDemoClick = () => {
    router.push('/demo');
  };

  const handleSignin = () => {
    router.push('/sign-in');
  };

  const handleSignup = () => {
    router.push('/sign-up');
  };

  const handleClick = () => {
    router.push('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Get form and result elements
    const form = e.currentTarget;
    const resultDiv = document.getElementById('result');
    const resultText = resultDiv?.querySelector('p');

    // Show loading state
    const submitButton = form.querySelector('button');
    const submitSpan = form.querySelector('button span');
    if (submitButton) submitButton.disabled = true;
    if (submitSpan) submitSpan.textContent = 'Sending...';

    // Get form data
    const formData = new FormData(form);
    formData.append('access_key', '8718924b-67f1-4bca-9a05-ba964b73b177'); // Replace with your actual key

    const object = Object.fromEntries(formData);
    const json = JSON.stringify(object);

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: json,
      }).then((res) => res.json());

      // Show success or error message
      if (res.success) {
        // Success
        console.log('Success', res);
        resultDiv?.classList.remove('hidden', 'bg-red-900');
        resultDiv?.classList.add('bg-green-900');
        resultText?.classList.remove('text-red-400');
        resultText?.classList.add('text-green-400');
        if (resultText) {
          resultText.innerText = "Message sent successfully! I'll get back to you soon.";
        }

        // Reset form
        form.reset();
      } else {
        // Error
        console.log('Error', res);
        resultDiv?.classList.remove('hidden', 'bg-green-900');
        resultDiv?.classList.add('bg-red-900');
        resultText?.classList.remove('text-green-400');
        resultText?.classList.add('text-red-400');
        if (resultText) {
          resultText.innerText = 'Something went wrong. Please try again later.';
        }
      }
    } catch (error) {
      // Network or other error
      console.error('Error:', error);
      resultDiv?.classList.remove('hidden', 'bg-green-900');
      resultDiv?.classList.add('bg-red-900');
      resultText?.classList.remove('text-green-400');
      resultText?.classList.add('text-red-400');
      if (resultText) {
        resultText.innerText = 'Something went wrong. Please try again later.';
      }
    } finally {
      // Reset button state
      const submitButton = form.querySelector('button');
      const submitSpan = form.querySelector('button span');
      if (submitButton) submitButton.disabled = false;
      if (submitSpan) submitSpan.textContent = 'Send Message';

      // Scroll to result message
      resultDiv?.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Hide message after 5 seconds
      setTimeout(() => {
        resultDiv?.classList.add('hidden');
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:80px_80px]"></div>

      <div className="relative z-10">
        {/* Header */}
        <header className="w-full px-6 lg:px-8 border-b border-zinc-800/50">
          <div className="mx-auto max-w-7xl">
            <nav className="flex items-center justify-between py-6">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                className="flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-zinc-950" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">NoteScape</h1>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="flex items-center gap-4"
              >
                {isSignedIn ? (
                  <>
                    <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full">
                      <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center text-xs font-bold text-white">
                        {user?.firstName?.charAt(0) ||
                          user?.emailAddresses?.[0]?.emailAddress?.charAt(0) ||
                          'U'}
                      </div>
                      <span className="text-sm text-zinc-300">Welcome back!</span>
                    </div>
                    <Button
                      onClick={handleClick}
                      size="lg"
                      className="relative bg-white text-zinc-950 hover:bg-zinc-200 font-medium group"
                    >
                      Dashboard
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleSignin}
                      variant="outline"
                      className="border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                      Sign In
                    </Button>
                    <Button
                      onClick={handleSignup}
                      size="lg"
                      className="relative bg-white text-zinc-950 hover:bg-zinc-200 font-medium group"
                    >
                      Get Started Free
                      <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </>
                )}
              </motion.div>
            </nav>
          </div>
        </header>

        {/* Hero */}
        <section className="px-6 lg:px-8 pt-20 pb-24">
          <div className="mx-auto max-w-5xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="space-y-8"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="inline-flex items-center gap-3 px-6 py-3 bg-zinc-900 border border-zinc-800 rounded-full text-sm text-zinc-300"
              >
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Now in Beta
              </motion.div>

              <h1 className="text-6xl lg:text-8xl font-bold tracking-tight leading-[0.9]">
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="block text-white mb-4"
                >
                  Your Ideas,
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="block text-zinc-400"
                >
                  Beautifully Crafted
                </motion.span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="text-xl lg:text-2xl text-zinc-400 max-w-3xl mx-auto leading-relaxed"
              >
                NoteScape transforms the way you capture and organize thoughts. A minimalist digital
                canvas designed for the modern creative mind, where inspiration meets innovation.
              </motion.p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-6 justify-center mt-16"
            >
              {!isSignedIn ? (
                <Button
                  onClick={handleSignup}
                  size="lg"
                  className="relative px-8 py-4 text-lg bg-white text-zinc-950 hover:bg-zinc-200 font-medium group"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              ) : (
                <Button
                  onClick={handleClick}
                  size="lg"
                  className="relative px-8 py-4 text-lg bg-white text-zinc-950 hover:bg-zinc-200 font-medium group"
                >
                  Continue Creating
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              )}

              <Button
                onClick={handleDemoClick}
                size="lg"
                variant="outline"
                className="px-8 py-4 text-lg border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white"
              >
                Try Demo
              </Button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="flex flex-wrap items-center justify-center gap-8 mt-16 text-zinc-500 text-sm"
            >
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                End-to-end encrypted
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Lightning fast
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                99.9% uptime
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 lg:px-8 py-32 border-t border-zinc-800/50">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h2 className="text-4xl lg:text-6xl font-bold text-white mb-6">
                Everything you need to create
              </h2>
              <div className="h-1 w-24 bg-zinc-600 rounded-full mx-auto"></div>
              <p className="text-zinc-400 text-xl max-w-3xl mx-auto mt-8 leading-relaxed">
                Powerful tools wrapped in an elegant interface. Built for creators who demand both
                beauty and functionality.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<PenTool className="w-7 h-7" />}
                title="Fluid Drawing"
                description="Precision tools with natural feel. Every stroke rendered with pixel-perfect clarity and responsiveness that adapts to your creative flow."
                delay={0}
              />
              <FeatureCard
                icon={<Layers className="w-7 h-7" />}
                title="Smart Organization"
                description="AI-powered categorization keeps your ideas structured without breaking your creative momentum. Intelligent tagging and search."
                delay={0.1}
              />
              <FeatureCard
                icon={<Share2 className="w-7 h-7" />}
                title="Seamless Collaboration"
                description="Real-time collaboration with version control. Share your work instantly with pixel-perfect export quality and team synchronization."
                delay={0.2}
              />
            </div>
          </div>
        </section>

        {/* Showcase */}
        <section className="px-6 lg:px-8 py-32 border-t border-zinc-800/50">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="text-center mb-20"
            >
              <h3 className="text-4xl lg:text-5xl font-bold text-white mb-8">
                See NoteScape in action
              </h3>
              <p className="text-zinc-400 text-xl max-w-2xl mx-auto">
                Experience the future of digital note-taking with our immersive preview
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              viewport={{ once: true }}
              className="relative group"
            >
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="aspect-video bg-zinc-950 flex items-center justify-center relative">
                  <div className="text-center space-y-6 z-10">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto"
                    >
                      <PenTool className="w-10 h-10 text-zinc-300" />
                    </motion.div>
                    <div className="space-y-2">
                      <p className="text-zinc-300 text-lg font-medium">Interactive Demo Preview</p>
                      <p className="text-zinc-500 text-sm">Coming Soon • Experience the magic</p>
                    </div>
                  </div>

                  {/* Animated grid overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px] opacity-30"></div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Enhanced CTA */}
        <section className="px-6 lg:px-8 py-32 border-t border-zinc-800/50">
          <div className="mx-auto max-w-5xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-16">
                <motion.div
                  initial={{ scale: 0.9 }}
                  whileInView={{ scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="relative z-10"
                >
                  <h3 className="text-4xl lg:text-5xl font-bold text-white mb-8">
                    Ready to transform your workflow?
                  </h3>
                  <p className="text-zinc-400 text-xl mb-12 max-w-3xl mx-auto leading-relaxed">
                    Join thousands of creators who have already discovered the power of NoteScape.
                    Start your creative journey today with our intuitive tools and beautiful
                    interface.
                  </p>

                  {!isSignedIn && (
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        onClick={handleSignup}
                        size="lg"
                        className="relative px-12 py-4 text-xl bg-white text-zinc-950 hover:bg-zinc-200 font-medium group"
                      >
                        Start Creating Today
                        <ArrowRight className="ml-3 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="px-6 lg:px-8 py-32 border-t border-zinc-800/50">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
              {/* Contact Information */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                  className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 shadow-xl h-fit"
                >
                  <h3 className="text-2xl font-bold text-white mb-8">Get in Touch</h3>

                  <div className="space-y-6">
                    {/* Email */}
                    <div className="flex items-center gap-4 group">
                      <div className="bg-zinc-800 p-3 rounded-full group-hover:bg-blue-600 transition-colors duration-300">
                        <Mail className="text-white h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-zinc-400 text-sm">Email</p>
                        <a
                          href="mailto:jdhiraj.dev@gmail.com"
                          className="text-white hover:text-blue-400 transition-colors"
                        >
                          jdhiraj.dev@gmail.com
                        </a>
                      </div>
                    </div>

                    {/* Twitter */}
                    <div className="flex items-center gap-4 group">
                      <div className="bg-zinc-800 p-3 rounded-full group-hover:bg-sky-500 transition-colors duration-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="text-white h-5 w-5"
                        >
                          <path d="M23 3a10.9 10.9 0 01-3.14 1.53A4.48 4.48 0 0022.4.36a9.09 9.09 0 01-2.88 1.1A4.52 4.52 0 0016.11 0c-2.63 0-4.77 2.24-4.77 5 0 .39.04.77.13 1.13C7.69 5.91 4.07 3.92 1.64.9a5.09 5.09 0 00-.65 2.52c0 1.74.86 3.28 2.18 4.18a4.27 4.27 0 01-2.16-.62v.06c0 2.43 1.67 4.45 3.89 4.91a4.52 4.52 0 01-2.15.09c.61 1.97 2.39 3.39 4.5 3.43A9.05 9.05 0 010 19.54 12.72 12.72 0 006.84 21c8.21 0 12.7-7.1 12.7-13.26 0-.2 0-.41-.01-.61A9.48 9.48 0 0023 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-zinc-400 text-sm">Twitter</p>
                        <a
                          href="https://twitter.com/JdhirajDev"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-sky-400 transition-colors"
                        >
                          @JdhirajDev
                        </a>
                      </div>
                    </div>

                    {/* LinkedIn */}
                    <div className="flex items-center gap-4 group">
                      <div className="bg-zinc-800 p-3 rounded-full group-hover:bg-blue-700 transition-colors duration-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="text-white h-5 w-5"
                        >
                          <path d="M19 0h-14C2.2 0 0 2.2 0 5v14c0 2.8 2.2 5 5 5h14c2.8 0 5-2.2 5-5V5c0-2.8-2.2-5-5-5zM7.1 20.5H3.5V9h3.6v11.5zM5.3 7.6c-1.1 0-2-.9-2-2s.9-2 2-2c1.1 0 2 .9 2 2s-.9 2-2 2zM20.5 20.5h-3.6v-5.6c0-1.3 0-3-1.9-3-1.9 0-2.2 1.4-2.2 2.9v5.7h-3.6V9h3.5v1.6h.1c.5-.9 1.7-1.9 3.6-1.9 3.9 0 4.6 2.5 4.6 5.7v6.1z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-zinc-400 text-sm">LinkedIn</p>
                        <a
                          href="https://www.linkedin.com/in/dhiraj-jatav"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-blue-400 transition-colors"
                        >
                          Dhiraj Jatav
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-zinc-800">
                    <p className="text-zinc-400 text-sm mt-2">Response time: 24-48 hours</p>
                  </div>
                </motion.div>
              </div>

              {/* Contact Form */}
              <div className="lg:col-span-3">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  <form
                    onSubmit={handleSubmit}
                    className="bg-zinc-900 rounded-2xl p-8 border border-zinc-800 shadow-xl"
                  >
                    {/* Form Success and Error Messages */}
                    <div id="result" className="hidden mb-4 p-4 rounded-lg">
                      <p className="text-center"></p>
                    </div>

                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="group">
                          <label
                            htmlFor="name"
                            className="block text-zinc-400 text-sm mb-2 group-focus-within:text-blue-400 transition-colors"
                          >
                            Your Name
                          </label>
                          <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none transition-all"
                          />
                        </div>
                        <div className="group">
                          <label
                            htmlFor="email"
                            className="block text-zinc-400 text-sm mb-2 group-focus-within:text-blue-400 transition-colors"
                          >
                            Your Email
                          </label>
                          <input
                            type="email"
                            id="email"
                            name="email"
                            required
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="group">
                        <label
                          htmlFor="subject"
                          className="block text-zinc-400 text-sm mb-2 group-focus-within:text-blue-400 transition-colors"
                        >
                          Subject
                        </label>
                        <input
                          type="text"
                          id="subject"
                          name="subject"
                          required
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none transition-all"
                        />
                      </div>

                      <div className="group">
                        <label
                          htmlFor="message"
                          className="block text-zinc-400 text-sm mb-2 group-focus-within:text-blue-400 transition-colors"
                        >
                          Your Message
                        </label>
                        <textarea
                          id="message"
                          name="message"
                          rows={6}
                          required
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-white focus:ring-2 focus:ring-blue-600 focus:border-transparent focus:outline-none transition-all resize-none"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 gap-4 sm:gap-0">
                        <p className="text-zinc-400 text-sm">I will respond within 24-48 hours</p>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="submit"
                          className="bg-white text-zinc-950 hover:bg-zinc-200 font-medium py-3 px-8 rounded-lg flex items-center gap-2 transition-all duration-300"
                        >
                          <span>Send Message</span>
                          <ArrowRight className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </div>
                  </form>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="px-6 lg:px-8 py-16 border-t border-zinc-800/50">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col items-center space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-zinc-950" />
                </div>
                <span className="text-lg font-semibold text-white">NoteScape</span>
              </div>
              <p className="text-zinc-500 text-sm">
                © {new Date().getFullYear()} NoteScape. Crafted with passion for creators
                worldwide.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

type FeatureCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
};

function FeatureCard({ icon, title, description, delay }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay }}
      viewport={{ once: true }}
      className="group"
    >
      <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all duration-300 h-full">
        <CardContent className="p-10">
          <div className="mb-8">
            <div className="w-16 h-16 bg-zinc-800 border border-zinc-700 rounded-2xl flex items-center justify-center group-hover:border-zinc-600 transition-all duration-300">
              <div className="text-zinc-400 group-hover:text-zinc-300 transition-colors duration-300">
                {icon}
              </div>
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-zinc-200 transition-colors duration-300">
            {title}
          </h3>
          <p className="text-zinc-400 leading-relaxed text-lg group-hover:text-zinc-300 transition-colors duration-300">
            {description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
