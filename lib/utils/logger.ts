type LogMeta = unknown;

type LogLevel = "INFO" | "WARN" | "ERROR";

function writeLog(level: LogLevel, message: string, meta?: LogMeta): void {
  const timestamp = new Date().toISOString();
  const payload = {
    timestamp,
    level,
    message,
    ...(meta === undefined ? {} : { meta }),
  };

  if (process.env.NODE_ENV === "production") {
    if (level === "ERROR") {
      console.error(JSON.stringify(payload));
      return;
    }

    if (level === "WARN") {
      console.warn(JSON.stringify(payload));
      return;
    }

    console.info(JSON.stringify(payload));
    return;
  }

  const prefix = `[${timestamp}] ${level}: ${message}`;

  if (level === "ERROR") {
    console.error(prefix, meta ?? "");
    return;
  }

  if (level === "WARN") {
    console.warn(prefix, meta ?? "");
    return;
  }

  console.info(prefix, meta ?? "");
}

export const logger = {
  info(message: string, meta?: LogMeta): void {
    writeLog("INFO", message, meta);
  },
  warn(message: string, meta?: LogMeta): void {
    writeLog("WARN", message, meta);
  },
  error(message: string, error?: LogMeta): void {
    writeLog("ERROR", message, error);
  },
};
