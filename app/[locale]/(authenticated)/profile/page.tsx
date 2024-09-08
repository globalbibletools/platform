import { query } from "@/app/db"
import { verifySession } from "@/app/session"

export default async function ProfileView() {
    const session = await verifySession()
    const result = session ? await query<{ name?: string, email: string }>(`SELECT name, email FROM "User" WHERE id = $1`, [session.user.id]) : undefined
    const user = result?.rows[0]

    return <div>
        {user && `${user.name} - ${user.email}`}
    </div>
}
