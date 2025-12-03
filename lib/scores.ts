import { supabase } from './supabase/client'

export async function saveScore(stageId: string, score: number) {
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data, error } = await supabase
        .from('scores')
        .insert([
            {
                user_id: user.id,
                email: user.email,
                stage_id: stageId,
                score: score
            }
        ])
        .select()

    if (error) {
        console.error('Error saving score:', error)
        return null
    }

    return data
}
