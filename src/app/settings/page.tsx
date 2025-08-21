"use client"
import { useState } from "react"
import { Key, Shield, ExternalLink, CheckCircle2, AlertCircle, Loader2, Lock, Zap, ArrowRight } from "lucide-react"

export default function OpenRouterKeySettings() {
  const [apiKey, setApiKey] = useState("")
  const [status, setStatus] = useState<null | string>(null)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    setBusy(true)
    setStatus(null)
    
    try {
      const response = await fetch('/api/save-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey }),
      })

      if (response.ok) {
        setStatus("saved")
        setApiKey("") // Clear the input on success
      } else {
        const error = await response.json()
        setStatus("failed")
        console.error('Failed to save API key:', error)
      }
    } catch (error) {
      setStatus("failed")
      console.error('Error saving API key:', error)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    setStatus(null)
    
    try {
      const response = await fetch('/api/delete-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setStatus("removed")
      } else {
        const error = await response.json()
        setStatus("failed")
        console.error('Failed to remove API key:', error)
      }
    } catch (error) {
      setStatus("failed")
      console.error('Error removing API key:', error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-950 to-gray-950 text-white relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,120,120,0.1)_0%,transparent_50%)] pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      
      <div className="relative z-10 p-6 lg:p-12">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-8">
            <div className="relative inline-block">
              <div className="w-20 h-20 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-2xl">
                <Key className="w-10 h-10 text-zinc-300" />
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-zinc-700 border-2 border-zinc-800 rounded-full flex items-center justify-center">
                  <Lock className="w-3 h-3 text-zinc-400" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                API Configuration
              </h1>
              <p className="text-zinc-400 text-xl max-w-2xl mx-auto leading-relaxed">
                Connect your OpenRouter API key to unlock advanced AI capabilities for your workspace
              </p>
            </div>
          </div>

          {/* Main Configuration Card */}
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-10 shadow-2xl">
            <div className="flex items-center gap-6 mb-10">
              <div className="w-16 h-16 bg-gradient-to-br from-zinc-800 to-zinc-700 rounded-2xl flex items-center justify-center border border-zinc-600/50 shadow-lg">
                <Shield className="w-8 h-8 text-zinc-300" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">Secure API Integration</h2>
                <p className="text-zinc-400">Your key is encrypted and never stored in plaintext</p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="block text-sm font-bold text-zinc-300 uppercase tracking-widest">
                  OpenRouter API Key
                </label>
                <div className="relative">
                  <input
                    type="password"
                    className="w-full bg-zinc-800/80 backdrop-blur border border-zinc-700/70 rounded-2xl px-8 py-6 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-zinc-600 transition-all duration-300 text-lg font-mono tracking-wider shadow-inner"
                    placeholder="sk-or-v1-••••••••••••••••••••••••••••••••"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <div className="absolute right-6 top-1/2 transform -translate-y-1/2">
                    <Key className="w-5 h-5 text-zinc-500" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  disabled={busy || !apiKey}
                  onClick={save}
                  className="group flex items-center gap-4 px-10 py-6 bg-white hover:bg-zinc-100 disabled:bg-zinc-800/50 disabled:cursor-not-allowed text-black disabled:text-zinc-600 font-bold rounded-2xl transition-all duration-300 flex-1 justify-center shadow-lg hover:shadow-xl disabled:shadow-none relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  {busy ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Shield className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
                  )}
                  <span className="text-lg">Save Securely</span>
                </button>
                
                <button
                  disabled={busy}
                  onClick={remove}
                  className="group flex items-center gap-4 px-10 py-6 bg-zinc-800/80 hover:bg-zinc-700/80 disabled:bg-zinc-800/30 disabled:cursor-not-allowed text-zinc-200 disabled:text-zinc-600 font-bold rounded-2xl border border-zinc-700/70 hover:border-zinc-600/70 transition-all duration-300 shadow-lg relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  {busy ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <AlertCircle className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
                  )}
                  <span className="text-lg">Remove Key</span>
                </button>
              </div>

              {/* Enhanced Status Message */}
              {status && (
                <div
                  className={`relative flex items-center gap-4 p-6 rounded-2xl border transition-all duration-500 shadow-lg ${
                    status === "saved" || status === "removed"
                      ? "bg-gradient-to-r from-emerald-950/80 to-green-950/60 border-emerald-800/50 text-emerald-200"
                      : "bg-gradient-to-r from-red-950/80 to-rose-950/60 border-red-800/50 text-red-200"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    status === "saved" || status === "removed" 
                      ? "bg-emerald-900/50 border border-emerald-700/50" 
                      : "bg-red-900/50 border border-red-700/50"
                  }`}>
                    {status === "saved" || status === "removed" ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <AlertCircle className="w-6 h-6" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="font-bold text-lg">
                      {status === "saved" && "Configuration Saved"}
                      {status === "removed" && "Key Removed Successfully"}
                      {status === "failed" && "Operation Failed"}
                    </span>
                    <p className="text-sm opacity-80">
                      {status === "saved" && "Your API key is now securely stored and ready to use"}
                      {status === "removed" && "All API credentials have been cleared from our servers"}
                      {status === "failed" && "Something went wrong. Please check your connection and try again"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Security Notice */}
          <div className="bg-gradient-to-br from-zinc-900/60 to-zinc-800/40 backdrop-blur-xl border border-zinc-700/50 rounded-3xl p-10 shadow-2xl">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-600/50 shadow-lg flex-shrink-0">
                <Shield className="w-8 h-8 text-zinc-300" />
              </div>
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-white">Enterprise-Grade Security</h3>
                <div className="space-y-3 text-zinc-400 leading-relaxed">
                  <p>
                    Your API credentials are protected with military-grade AES-256-GCM encryption and stored in isolated, secure environments. We implement zero-knowledge architecture ensuring your keys never appear in logs or debugging tools.
                  </p>
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                      <span className="text-zinc-300">End-to-end encryption</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                      <span className="text-zinc-300">Zero-knowledge storage</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                      <span className="text-zinc-300">SOC 2 compliant</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Setup Guide */}
          <div className="bg-gradient-to-br from-zinc-900/80 to-zinc-900/60 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-10 shadow-2xl">
            <div className="flex items-center gap-6 mb-12">
              <div className="w-16 h-16 bg-gradient-to-br from-zinc-800 to-zinc-700 rounded-2xl flex items-center justify-center border border-zinc-600/50 shadow-lg">
                <Zap className="w-8 h-8 text-zinc-300" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white">Quick Setup Guide</h2>
                <p className="text-zinc-400">Get started in under 2 minutes</p>
              </div>
            </div>

            <div className="space-y-10">
              {/* Enhanced Step 1 */}
              <div className="group relative">
                <div className="flex gap-8 items-start">
                  <div className="flex-shrink-0 relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-white to-zinc-200 text-black rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg">
                      1
                    </div>
                    <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                  <div className="space-y-4 flex-1">
                    <h3 className="font-bold text-white text-xl group-hover:text-zinc-100 transition-colors duration-200">
                      Create OpenRouter Account
                    </h3>
                    <p className="text-zinc-400 leading-relaxed text-lg group-hover:text-zinc-300 transition-colors duration-200">
                      Navigate to{" "}
                      <a
                        href="https://openrouter.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-white hover:text-zinc-200 transition-all duration-200 font-semibold border-b border-zinc-600 hover:border-zinc-400 pb-0.5"
                      >
                        openrouter.ai
                        <ExternalLink className="w-4 h-4" />
                      </a>{" "}
                      and register for a new account or sign into your existing one.
                    </p>
                  </div>
                </div>
              </div>

              {/* Enhanced Step 2 */}
              <div className="group relative">
                <div className="flex gap-8 items-start">
                  <div className="flex-shrink-0 relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-white to-zinc-200 text-black rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg">
                      2
                    </div>
                    <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                  <div className="space-y-4 flex-1">
                    <h3 className="font-bold text-white text-xl group-hover:text-zinc-100 transition-colors duration-200">
                      Locate Free Models
                    </h3>
                    <p className="text-zinc-400 leading-relaxed text-lg group-hover:text-zinc-300 transition-colors duration-200">
                      Search for the free tier model to get started without any charges:
                    </p>
                    <div className="bg-zinc-800/60 backdrop-blur border border-zinc-700/50 rounded-xl px-6 py-4 font-mono text-zinc-200 text-lg shadow-inner">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                        <span>OpenAI: gpt-oss-20b (free)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Step 3 */}
              <div className="group relative">
                <div className="flex gap-8 items-start">
                  <div className="flex-shrink-0 relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-white to-zinc-200 text-black rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg">
                      3
                    </div>
                    <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>
                  <div className="space-y-4 flex-1">
                    <h3 className="font-bold text-white text-xl group-hover:text-zinc-100 transition-colors duration-200">
                      Generate & Configure
                    </h3>
                    <p className="text-zinc-400 leading-relaxed text-lg group-hover:text-zinc-300 transition-colors duration-200">
                      Access your account dashboard, create a new API key, copy the generated token, and paste it in the field above. You&#39;ll be ready to start using advanced AI features immediately.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Call to Action */}
            <div className="mt-14 pt-10 border-t border-zinc-800/50">
              <div className="flex flex-col sm:flex-row gap-6 items-center justify-between">
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-white">Ready to get started?</h4>
                  <p className="text-zinc-400">Access your OpenRouter dashboard now</p>
                </div>
                <a
                  href="https://openrouter.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-4 px-10 py-6 bg-gradient-to-r from-white to-zinc-100 hover:from-zinc-100 hover:to-white text-black font-bold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <span className="text-lg relative z-10">Get Your API Key</span>
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300 relative z-10" />
                </a>
              </div>
            </div>
          </div>

          {/* Enhanced Features Preview */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-zinc-900/60 to-zinc-800/40 backdrop-blur border border-zinc-700/50 rounded-2xl p-8 group hover:border-zinc-600/70 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-6 h-6 text-zinc-300" />
              </div>
              <h3 className="font-bold text-white text-lg mb-3">Lightning Fast</h3>
              <p className="text-zinc-400 leading-relaxed">
                Optimized API integration for instant responses and seamless workflow integration.
              </p>
            </div>

            <div className="bg-gradient-to-br from-zinc-900/60 to-zinc-800/40 backdrop-blur border border-zinc-700/50 rounded-2xl p-8 group hover:border-zinc-600/70 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-6 h-6 text-zinc-300" />
              </div>
              <h3 className="font-bold text-white text-lg mb-3">Bank-Level Security</h3>
              <p className="text-zinc-400 leading-relaxed">
                Military-grade encryption ensures your API credentials remain completely private and secure.
              </p>
            </div>

            <div className="bg-gradient-to-br from-zinc-900/60 to-zinc-800/40 backdrop-blur border border-zinc-700/50 rounded-2xl p-8 group hover:border-zinc-600/70 transition-all duration-300 shadow-lg hover:shadow-xl">
              <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Key className="w-6 h-6 text-zinc-300" />
              </div>
              <h3 className="font-bold text-white text-lg mb-3">One-Time Setup</h3>
              <p className="text-zinc-400 leading-relaxed">
                Configure once and enjoy seamless AI assistance across all your projects and workspaces.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}