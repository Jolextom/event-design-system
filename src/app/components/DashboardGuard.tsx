import { useAuth } from "@/app/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.replace("/auth");
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-gray-500 text-lg">Loading...</div>
            </div>
        );
    }

    return <>{children}</>;
}
