import * as Notifications from "expo-notifications";
import { Item } from "../types";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleExpiryNotification(
  item: Item,
  locationName?: string,
): Promise<string | null> {
  const notifyDate = new Date(item.expiry_date);
  notifyDate.setDate(notifyDate.getDate() - 1);
  notifyDate.setHours(9, 0, 0, 0);

  if (notifyDate <= new Date()) return null;

  const location = locationName ?? "your household";

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "TupperAware — expiring tomorrow",
      body: `${item.name} in ${location} expires tomorrow`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: notifyDate,
    },
  });

  return identifier;
}

export async function cancelNotification(identifier: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(identifier);
}

export async function scheduleAllExpiryNotifications(
  items: Item[],
): Promise<string[]> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const identifiers: string[] = [];
  for (const item of items) {
    const id = await scheduleExpiryNotification(item);
    if (id) identifiers.push(id);
  }
  return identifiers;
}
