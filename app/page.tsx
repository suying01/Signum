"use client"

import { useState } from 'react'
import SignStreamGame from '@/components/SignStreamGame'
import StageSelect from '@/components/StageSelect'
import HoleInTheWallGame from '@/components/HoleInTheWallGame'
import { Stage } from '@/lib/stages'

export default function Home() {
  const [currentStage, setCurrentStage] = useState<Stage | null>(null)
  const [isChallengeMode, setIsChallengeMode] = useState(false)

  if (isChallengeMode) {
    return (
      <HoleInTheWallGame onBack={() => setIsChallengeMode(false)} />
    )
  }

  if (currentStage) {
    return (
      <SignStreamGame
        stage={currentStage}
        onBack={() => setCurrentStage(null)}
      />
    )
  }

  return (
    <StageSelect
      onSelectStage={setCurrentStage}
      onSelectChallenge={() => setIsChallengeMode(true)}
    />
  )
}
