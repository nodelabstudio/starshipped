import { SignIn } from "@clerk/nextjs";
import { NeonCursor } from "@/components/neon-cursor";

export default function SignInPage() {
  return (
    <div className="pt-16 flex flex-col items-center gap-6">
      <NeonCursor orbitSelector="#auth-card" />
      <div id="auth-card" className="max-w-full">
        <SignIn />
      </div>
      <p className="eyebrow text-center">
        Demo access: guest@gmail.com &middot; kessel-run-2268
      </p>
    </div>
  );
}
