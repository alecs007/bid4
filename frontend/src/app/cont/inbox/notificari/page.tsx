import type { Metadata } from "next";

import { NotificationList } from "../_components/NotificationList";

export const metadata: Metadata = {
  title: "Notificări",
  description: "Ce s-a întâmplat cu licitațiile, comenzile și cauzele tale.",
  robots: { index: false, follow: false },
};

export default function NotificationsPage() {
  return <NotificationList />;
}
