"use client";
import { useOrganization } from "@clerk/nextjs"
import { OrgSelectView } from "./select-org-view";
import { AuthLayout } from "../layouts/auth-layout";

export const OrganizationGuard = ({ children }: { children: React.ReactNode }) => {
    const { organization } = useOrganization();

    if(!organization) {
        return (
            <AuthLayout>
                <OrgSelectView/>
            </AuthLayout>
        )
    }
    return (
        <div>
            {children}
        </div>
    )
}