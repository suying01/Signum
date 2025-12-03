"use client"

import { useState } from 'react'
import SignStreamGame from '@/components/SignStreamGame'
import StageSelect from '@/components/StageSelect'
import { Stage } from '@/lib/stages'

export default function Home() {
  const [currentStage, setCurrentStage] = useState<Stage | null>(null)

  if (currentStage) {
    return (
      <SignStreamGame
        stage={currentStage}
        onBack={() => setCurrentStage(null)}
      />
    )
  }

  return (
    <StageSelect onSelectStage={setCurrentStage} />
  )
}
