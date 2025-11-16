type AuthConfig = {
  providers: Array<{
    domain: string;
    applicationID: string;
  }>;
};

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ]
} satisfies AuthConfig;
