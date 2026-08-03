import {signInWithGoogle} from "@/app/auth/actions";

export function GoogleAuthButton({next="/dashboard/learner/my-learning",label="Continue with Google",referrer=""}:{next?:string;label?:string;referrer?:string}){
  return <form action={signInWithGoogle} className="google-auth-form"><input type="hidden" name="next" value={next}/><input type="hidden" name="referrer" value={referrer}/><button type="submit" className="google-auth-button"><span aria-hidden="true">G</span>{label}</button></form>;
}
