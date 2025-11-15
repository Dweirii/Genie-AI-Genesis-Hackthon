"use client";

import { useAtomValue } from "jotai";
import { WidgetAuthScreen } from "../screens/widget-auth-screen";
import { screenAtom } from "../../atoms/widget-atoms";
import { WidgetErrorScreen } from "../screens/widget-error-screen";
import { WidgetLoadingScreen } from "../screens/widget-loading-screen";
import { WidgetSelectionScreen } from "../screens/widget-selection-screen";
import { WidgetChatScreen } from "../screens/widget-chat-screen";

interface Props {
    organizationId: string;
};

export const WidgetView = ({ organizationId } : Props) => {
    const screen = useAtomValue(screenAtom);

    const screenComponents = {
        auth: <WidgetAuthScreen/>,
        loading: <WidgetLoadingScreen organizationId={organizationId} />,
        error: <WidgetErrorScreen/>,
        voice: <div>Voice Screen</div>,
        selection: <WidgetSelectionScreen/>,
        chat: <WidgetChatScreen/>,
        inbox: <div>Inbox Screen</div>,
        contact: <div>Contact Screen</div>,
    }

    return (
        <main className="min-h-screen min-w-screen flex h-full w-full flex-col overflow-hidden rounded-xl border bg-muted">
            {screenComponents[screen]}
        </main>
    );
};