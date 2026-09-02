import { CloudUpload } from "lucide-react"


export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <div className="h-screen flex items-center justify-center flex-col gap-6">
            {children}
        </div>
    )
}