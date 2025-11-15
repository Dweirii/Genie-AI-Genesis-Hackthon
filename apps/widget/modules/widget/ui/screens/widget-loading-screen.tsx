"use client"
import { useAtomValue, useSetAtom } from "jotai";
import { contactSessionIdAtomFamily, errorMessageAtom, loadingMessageAtom, organizationIdAtom, screenAtom } from "../../atoms/widget-atoms";
import { WidgetHeader } from "../components/widget-header";
import { LoaderIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "@workspace/backend/_generated/api";

type InitStep = "storage" | "org" | "session" | "settings" | "vapi" | "done";
export const WidgetLoadingScreen = ({ organizationId } : { organizationId: string | null }) => {
  const [step, setStep] = useState<InitStep>("org");
  const [sessionValid, setSessionValid] = useState(false);

  const setScreen = useSetAtom(screenAtom);
  const setErrorMessage = useSetAtom(errorMessageAtom);
  const loadingMessage = useAtomValue(loadingMessageAtom);
  const setLoadingMessage = useSetAtom(loadingMessageAtom);
  const setOrganizationId = useSetAtom(organizationIdAtom);

  const contactSessionId = useAtomValue(contactSessionIdAtomFamily(organizationId || ""));

  // the first step is to validate the organization 
  const validateOrganization = useAction(api.public.organizations.validate);
  useEffect(() => {
    if(step !== "org") {
        return;
    }

    setLoadingMessage("Loading organization");

    if(!organizationId) {
        setErrorMessage("Organization ID is required");
        setScreen("error");
        return;
    }

    setLoadingMessage("Verifying organization...");

    validateOrganization({ organizationId })
        .then((result) => {
            if (result.valid) {
                setOrganizationId(organizationId);
                setStep("session");
            } else {
                setErrorMessage(result.reason || "Invalid configuration");
                setScreen("error");
            }
        })
        .catch (() => {
            setErrorMessage("Unable to verify organization.");
            setScreen("error");
        })
  }, [step, organizationId, setErrorMessage, setScreen, setStep, validateOrganization, setLoadingMessage]);

  // the second step is for vaildate the session after we successfly validated the organization so we will validate the session if exists
  const validateContactSession = useMutation(api.public.contactSessions.validate);
  useEffect(() => {
    if (step !== "session") {
      return;
    }

    setLoadingMessage("Finding contact session...");
    if (!contactSessionId) {
      setSessionValid(false);
      setStep("done");
      return;
    }
    setLoadingMessage("Validating session...");
    
    validateContactSession({
        contactSessionsId: contactSessionId,
    })
        .then((result) => {
            setSessionValid(result.valid);
            setStep("done");
        })
        .catch(() => {
            setSessionValid(false);
            setStep("settings");
        });

  }, [step, contactSessionId, validateContactSession, setLoadingMessage]);

  useEffect(() => {
    if (step !== "done") {
        return;
    }

    const hasValidSession = contactSessionId && sessionValid;
    setScreen(hasValidSession ? "selection" : "auth");
  }, [step, contactSessionId, sessionValid, sessionValid]);

  return (
    <>
      <WidgetHeader>
        <div className="flex flex-col justify-between gap-y-2 px-2 py-6 font-semiboild ">
          <p className="text-3xl">
            Hi there! <span className="wave">👋</span>
          </p>
          <p className="text-lg">Let&apos;s get you started.</p>
        </div>
      </WidgetHeader>
      <div className="flex flex-1 flex-col items-center justify-center gap-y-4 p-4 text-muted-foreground">
        <LoaderIcon className="animate-spin"/>
        <p className="text-sm">
            {loadingMessage || "Loading..."}
        </p>
      </div>

    </>
  )
};


// use action when convex uses third party tools and use mutation when your operation are only for convex it self!