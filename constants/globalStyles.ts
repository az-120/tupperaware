import {StyleSheet} from "react-native";
import {Colors} from "./colors";
import {Typography} from "./typography";

export const GlobalStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: Typography.xs,
    fontFamily: Typography.semibold,
    color: Colors.textTertiary,
    letterSpacing: Typography.wider_tracking,
    textTransform: "uppercase",
    marginTop: 20,
    marginBottom: 8,
  },
  navTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.semibold,
    color: Colors.textPrimary,
  },
  bodyText: {
    fontSize: Typography.base,
    fontFamily: Typography.regular,
    color: Colors.textPrimary,
    lineHeight: Typography.base * Typography.normal,
  },
  mutedText: {
    fontSize: Typography.sm,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
  },
});
