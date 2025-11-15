import { AuthGuard } from "@/modules/auth/ui/components/auth-guard"
import { OrganizationGuard } from "@/modules/auth/ui/components/organization-Guard"
import { SidebarInset, SidebarProvider } from "@workspace/ui/components/sidebar";
import { cookies } from "next/headers";
import { DashboardSidebar } from "../components/dashboard-sidebar";

export const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {

    const cookieStore = await cookies();
    const sidebarState = cookieStore.get("sidebar_state")?.value;
    // Default to true (open) if cookie doesn't exist, otherwise use the cookie value
    const defaultOpen = sidebarState === undefined ? true : sidebarState === "true";

    return (
        <AuthGuard>
            <OrganizationGuard>
                <SidebarProvider defaultOpen={defaultOpen}>
                    <DashboardSidebar/>
                    <SidebarInset>
                        {children}
                    </SidebarInset>
                </SidebarProvider>
            </OrganizationGuard>
        </AuthGuard>
    );
};