import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="pt-16 flex flex-col items-center gap-6">
      <SignIn />
      <p className="eyebrow text-center">
        Demo access: guest@gmail.com &middot; kessel-run-2268
      </p>
    </div>
  );
}
