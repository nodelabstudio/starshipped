import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="pt-16 flex justify-center">
      <SignUp />
    </div>
  );
}
