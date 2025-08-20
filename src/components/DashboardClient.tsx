"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { SignOutButton } from "@clerk/nextjs"
import { Edit, Check, X, Plus, Calendar, Trash2, ExternalLink, FileText, Clock } from "lucide-react"
import Link from "next/link"

type DocumentItem = {
  id: string
  title?: string
  updated_at: string
}

export default function DashboardClient() {
  const [docs, setDocs] = useState<DocumentItem[]>([])
  const [loading, setLoading] = useState(false)
  const [newTitle, setNewTitle] = useState("") // for new canvas creation
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const fetchDocs = async () => {
    setLoading(true)
    const res = await fetch("/api/documents/list")
    const json = await res.json()
    setDocs((json.documents as DocumentItem[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchDocs()
  }, [])

  const createDoc = async () => {
    const titleToSend = newTitle.trim() || "Untitled"
    const res = await fetch("/api/documents/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleToSend }),
    })
    const json = await res.json()
    if (json.id) {
      setNewTitle("") // Clear the input after creation
      router.push(`/canvas/${json.id}`)
    } else {
      alert("Failed to create document")
    }
  }

  const startEditing = (id: string, currentTitle: string) => {
    setEditingId(id)
    setEditingTitle(currentTitle)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingTitle("")
  }

  const saveEdit = async (id: string) => {
    const titleToSend = editingTitle.trim() || "Untitled"
    const res = await fetch("/api/documents/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title: titleToSend }),
    })
    const json = await res.json()
    if (json.ok || json.id) {
      fetchDocs()
      cancelEditing()
    } else {
      alert("Failed to edit document")
    }
  }

  const deleteDoc = async (id: string) => {
    if (!confirm("Delete this canvas? This action cannot be undone.")) return
    setDeletingId(id)
    
    const res = await fetch("/api/documents/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    const j = await res.json()
    if (j.ok) {
      fetchDocs()
    } else {
      alert("Delete failed")
    }
    setDeletingId(null)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTitle.trim()) {
      createDoc()
    }
  }

  const handleEditKeyPress = (e: React.KeyboardEvent, id: string) => {
    if (e.key === 'Enter') {
      saveEdit(id)
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Enhanced Header with Gradient Border */}
      <div className="relative border-b border-zinc-800/30 bg-gradient-to-b from-zinc-900/80 to-zinc-950/80 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-800/10 via-transparent to-zinc-800/10"></div>
        <div className="relative max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-zinc-300" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-zinc-300 bg-clip-text text-transparent">
                  Your Canvases
                </h1>
              </div>
              <p className="text-zinc-400 text-lg">Create and manage your design workspace</p>
            </div>

            <div className="flex items-center gap-4">
              {/* Enhanced New Canvas Input */}
              <div className="flex items-center gap-3 bg-zinc-900/60 backdrop-blur-sm rounded-2xl p-2 border border-zinc-800/50 hover:border-zinc-700/50 transition-all duration-300">
                <div className="flex items-center gap-2 bg-zinc-800/50 rounded-xl p-1 min-w-[250px]">
                  <input
                    type="text"
                    placeholder="Enter canvas title..."
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="px-4 py-3 bg-transparent text-white placeholder-zinc-500 border-0 focus:outline-none focus:ring-0 flex-1"
                  />
                </div>
                <Button 
                  onClick={createDoc} 
                  disabled={!newTitle.trim()}
                  className="bg-white text-black hover:bg-zinc-200 font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Plus size={18} className="mr-2" />
                  Create
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/settings"
                  className="px-5 py-3 bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-200 hover:text-white rounded-xl transition-all duration-200 font-medium border border-zinc-800/50 hover:border-zinc-700/50 backdrop-blur-sm"
                >
                  Add API
                </Link>

                <SignOutButton redirectUrl="/sign-in">
                  <Button
                    variant="outline"
                    className="border-zinc-700/50 text-zinc-300 hover:bg-zinc-800/60 hover:text-white bg-transparent px-5 py-3 rounded-xl font-medium backdrop-blur-sm transition-all duration-200"
                  >
                    Logout
                  </Button>
                </SignOutButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Content Area */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-zinc-800 border-t-zinc-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-zinc-400 rounded-full animate-spin animate-reverse"></div>
            </div>
            <div className="text-zinc-400 text-lg mt-6 font-medium">Loading your canvases...</div>
            <div className="text-zinc-600 text-sm mt-2">This might take a moment</div>
          </div>
        ) : docs.length === 0 ? (
          <div className="text-center py-32">
            <div className="w-24 h-24 mx-auto mb-8 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
              <FileText className="w-10 h-10 text-zinc-500" />
            </div>
            <div className="text-zinc-400 text-2xl font-semibold mb-3">No canvases yet</div>
            <div className="text-zinc-600 text-lg max-w-md mx-auto leading-relaxed">
              Ready to start creating? Enter a title above and click &quot;Create&quot; to build your first canvas
            </div>
          </div>
        ) : (
          <>
            {/* Stats Header */}
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-zinc-500"></div>
                  <span className="text-zinc-400 font-medium">
                    {docs.length} canvas{docs.length !== 1 ? 'es' : ''} total
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-500 text-sm">
                    Last updated {formatDate(docs[0]?.updated_at || new Date().toISOString())}
                  </span>
                </div>
              </div>
            </div>

            {/* Enhanced Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {docs.map((d: DocumentItem, index: number) => (
                <div
                  key={d.id}
                  className="group relative bg-gradient-to-br from-zinc-900/60 to-zinc-950/60 backdrop-blur-sm border border-zinc-800/40 rounded-2xl p-7 hover:border-zinc-700/60 transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-2xl hover:shadow-zinc-950/20"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'fadeInUp 0.6s ease-out forwards',
                    opacity: 0,
                    transform: 'translateY(20px)'
                  }}
                >
                  {/* Subtle gradient overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-800/0 to-zinc-800/0 group-hover:from-zinc-800/5 group-hover:to-zinc-900/10 rounded-2xl transition-all duration-300"></div>
                  
                  <div className="relative z-10">
                    {editingId === d.id ? (
                      <div className="space-y-5">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyPress={(e) => handleEditKeyPress(e, d.id)}
                          className="w-full px-4 py-3 bg-zinc-800/60 border border-zinc-700/60 rounded-xl text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-600/50 focus:border-zinc-600/50 transition-all duration-200 backdrop-blur-sm"
                          autoFocus
                        />
                        <div className="flex gap-3">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(d.id)}
                            className="bg-white text-black hover:bg-zinc-200 font-semibold px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105"
                          >
                            <Check size={16} className="mr-2" />
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                            className="border-zinc-700/60 text-zinc-300 hover:bg-zinc-800/60 bg-transparent font-medium px-4 py-2 rounded-lg transition-all duration-200"
                          >
                            <X size={16} className="mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {/* Enhanced Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-700/50 to-zinc-800/50 flex items-center justify-center border border-zinc-700/30">
                                <FileText className="w-5 h-5 text-zinc-400" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-white group-hover:text-zinc-100 transition-colors leading-tight">
                                  {d.title || "Untitled"}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
                                  <span className="text-zinc-500 text-sm font-medium">Canvas</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Enhanced Date Display */}
                            <div className="flex items-center gap-3 text-zinc-500 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar size={14} className="text-zinc-600" />
                                <span className="font-medium">Updated</span>
                              </div>
                              <span className="text-zinc-400 font-mono">
                                {formatDate(d.updated_at)}
                              </span>
                            </div>
                          </div>

                          {/* Enhanced Edit Button */}
                          <button
                            onClick={() => startEditing(d.id, d.title || "Untitled")}
                            className="p-3 text-zinc-500 hover:text-white hover:bg-zinc-800/60 rounded-xl transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 backdrop-blur-sm border border-transparent hover:border-zinc-700/30"
                          >
                            <Edit size={18} />
                          </button>
                        </div>

                        {/* Enhanced Action Buttons */}
                        <div className="flex gap-3 pt-4 border-t border-zinc-800/30">
                          <Button
                            onClick={() => router.push(`/canvas/${d.id}`)}
                            className="flex-1 bg-white text-black hover:bg-zinc-200 font-bold py-3 px-4 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg group/button"
                          >
                            <ExternalLink size={16} className="mr-2 group-hover/button:rotate-12 transition-transform duration-200" />
                            Open Canvas
                          </Button>
                          
                          <Button
                            variant="outline"
                            onClick={() => deleteDoc(d.id)}
                            disabled={deletingId === d.id}
                            className="border-zinc-700/50 text-zinc-400 hover:bg-zinc-800/60 hover:border-zinc-600/60 hover:text-zinc-200 bg-transparent px-4 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                          >
                            {deletingId === d.id ? (
                              <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Subtle hover glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-zinc-800/0 via-zinc-700/0 to-zinc-800/0 group-hover:from-zinc-800/10 group-hover:via-zinc-700/5 group-hover:to-zinc-800/10 transition-all duration-500 pointer-events-none"></div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes animate-reverse {
          to {
            transform: rotate(-360deg);
          }
        }
        
        .animate-reverse {
          animation: animate-reverse 1s linear infinite;
        }
      `}</style>
    </div>
  )
}