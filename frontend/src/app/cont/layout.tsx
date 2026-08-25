import { RequireUser } from "@/components/auth/RouteGuard";

export default function AccountLayout({ children }: LayoutProps<"/cont">) {
  return <RequireUser>{children}</RequireUser>;
}
