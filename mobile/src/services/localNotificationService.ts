export async function scheduleLocalReminder(input: {
  title: string;
  body: string;
  scheduledAt?: string | null;
}) {
  const Notifications = await import('expo-notifications');
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  const permissions = await Notifications.requestPermissionsAsync();
  if (!permissions.granted) {
    return null;
  }
  const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : new Date(Date.now() + 60_000);
  return Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: scheduledAt,
    },
  });
}
