import { AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";

import type { ANTTAlertData } from "@/lib/rules/types";

interface ANTTAlertProps {
  alert: ANTTAlertData;
}

interface ANTTAlertProps {
  alert: {
    type: "success" | "warning" | "error";
    message: string;
  };
}

export function ANTTAlert({ alert }: ANTTAlertProps) {
  const styles = {
    success: {
      container: "bg-green-50 border-green-200 text-green-800",
      icon: <CheckCircle className="w-4 h-4 text-green-600" />,
    },
    warning: {
      container: "bg-yellow-50 border-yellow-200 text-yellow-800",
      icon: <AlertTriangle className="w-4 h-4 text-yellow-600" />,
    },
    error: {
      container: "bg-red-50 border-red-200 text-red-800",
      icon: <AlertCircle className="w-4 h-4 text-red-600" />,
    },
  };

  const style = styles[alert.type];

  return (
    <div
      className={`flex items-start gap-2 p-3 border rounded-lg ${style.container}`}
    >
      <div className="mt-0.5">{style.icon}</div>
      <p className="text-sm flex-1">{alert.message}</p>
    </div>
  );
}
