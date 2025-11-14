"use client"
import { useMutation, useQuery, Authenticated, Unauthenticated } from "convex/react"
import { api } from "@workspace/backend/_generated/api"
import { Button } from "@workspace/ui/components/button";
import { SignInButton, UserButton } from "@clerk/nextjs";

export default function Page() {
  const users = useQuery(api.users.getMany);
  const addUser = useMutation(api.users.add);

  return (
    <>
      <Authenticated>
        <div className="flex items-center  flex-col justify-center min-h-svh">
            <h1 className="text-2xl font-bold">Hello World apps</h1>
            {JSON.stringify(users)}
            <Button
              onClick={() => addUser()}
            >
              Add user
            </Button>
            <UserButton/>
        </div>
      </Authenticated>
      <Unauthenticated>
        <p>Must be signed in</p>
        <SignInButton />
      </Unauthenticated>
    </>
  )
}
