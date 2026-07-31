import {signInWithGoogle} from "@/app/auth/actions";

export function GoogleAuthButton({next="/dashboard/learner/my-learning",label="Continue with Google",role="learner"}:{next?:string;label?:string;role?:"learner"|"creator"}){
  return <><div className="auth-divider"><span>or</span></div><form action={signInWithGoogle} className="google-auth-form"><input type="hidden" name="next" value={next}/><input type="hidden" name="role" value={role}/><button type="submit" className="google-auth-button"><span aria-hidden="true">G</span>{label}</button></form></>;
}
