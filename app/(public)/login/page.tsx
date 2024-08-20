import ModalView, { ModalViewTitle } from "@/app/components/ModalView";
import LoginForm from './LoginForm'

export default function LoginPage() {
    return <ModalView className="max-w-[480px] w-full">
        <ModalViewTitle>Log In</ModalViewTitle>
        <LoginForm />
    </ModalView>
}
