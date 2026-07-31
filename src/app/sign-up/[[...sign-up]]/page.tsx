import { SignUp } from "@clerk/nextjs";
import { NeonCursor } from "@/components/neon-cursor";

export default function SignUpPage() {
  return (
    <div className="pt-16 flex justify-center">
      <NeonCursor orbitSelector="#auth-card" />
      <div id="auth-card">
        <SignUp />
      </div>
    </div>
  );
}
