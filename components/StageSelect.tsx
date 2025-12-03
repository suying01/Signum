import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Lock, Star, Trophy, User, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { STAGES, Stage } from '@/lib/stages'
import AuthModal from './AuthModal'
import { supabase } from '@/lib/supabase/client'

type StageSelectProps = {
    onSelectStage: (stage: Stage) => void
}

export default function StageSelect({ onSelectStage }: StageSelectProps) {
    const [isAuthOpen, setIsAuthOpen] = useState(false)
    const [userEmail, setUserEmail] = useState<string | null>(null)

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUserEmail(session?.user?.email ?? null)
        })
    }, [])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        setUserEmail(null)
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center font-sans">
            <header className="w-full max-w-md mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink mb-2 tracking-tighter italic">
                        SignStream
                    </h1>
                    <p className="text-gray-400">Select a Stage</p>
                </div>

                {userEmail ? (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleLogout}
                            className="rounded-full border-white/20 hover:bg-white/10 text-white"
                            title="Logout"
                        >
                            <User className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <Button
                        onClick={() => setIsAuthOpen(true)}
                        className="bg-white/10 hover:bg-white/20 text-white rounded-full px-4"
                    >
                        Login
                    </Button>
                )}
            </header>

            <div className="w-full max-w-md flex flex-col gap-4">
                {STAGES.map((stage, index) => (
                    <motion.div
                        key={stage.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card
                            className={cn(
                                "bg-gray-900/50 border-2 hover:border-neon-blue transition-colors cursor-pointer group overflow-hidden relative",
                                "border-gray-800"
                            )}
                            onClick={() => onSelectStage(stage)}
                        >
                            <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-r transition-opacity", stage.color)} />

                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="flex flex-col">
                                    <CardTitle className="text-xl font-bold text-white group-hover:text-neon-blue transition-colors">
                                        {stage.id}. {stage.name}
                                    </CardTitle>
                                    <CardDescription className="text-gray-400">
                                        {stage.description}
                                    </CardDescription>
                                </div>
                                {index === 0 ? (
                                    <Play className="text-neon-blue w-8 h-8 fill-current opacity-0 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <Lock className="text-gray-600 w-6 h-6" />
                                )}
                            </CardHeader>

                            <CardContent>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                                            {stage.phrases.length} Phrases
                                        </Badge>
                                        <Badge variant="secondary" className="bg-gray-800 text-gray-300">
                                            {stage.speedMultiplier}x Speed
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-1 text-yellow-500">
                                        <Trophy className="w-4 h-4" />
                                        <span className="font-bold">{stage.requiredScore}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <AuthModal
                isOpen={isAuthOpen}
                onClose={() => setIsAuthOpen(false)}
                onLoginSuccess={(email) => setUserEmail(email)}
            />
        </div>
    )
}
