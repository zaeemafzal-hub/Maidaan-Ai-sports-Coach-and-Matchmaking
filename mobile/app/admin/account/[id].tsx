import React, { useCallback, useState } from "react";
import { Text } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../../../store/useAuthStore";
import {
  accountAdminService,
  AccountDetails,
} from "../../../services/accountAdminService";
import { FormInput } from "../../../components/ui/FormInput";
import {
  Page,
  Card,
  Action,
  Notice,
  Busy,
  styles,
} from "../../../components/venues/VenueUI";
// Only useful profile fields are displayed; no authentication or provider metadata.
const labels: Record<string, string> = {
  primary_sport: "Primary sport",
  skill_level: "Skill level",
  primary_location: "Location",
  bio: "Bio",
  team_name: "Team name",
  home_area: "Home area",
  hub_name: "Venue name",
  location: "Address",
  contact_number: "Contact number",
  sports: "Sports",
  court_count: "Playing spaces",
  is_verified: "Verified",
  preferred_sports: "Sports",
  experience_years: "Experience (years)",
  team_size: "Team size",
};
function Details({
  title,
  record,
}: {
  title: string;
  record: Record<string, unknown> | null;
}) {
  return record ? (
    <Card>
      <Text style={styles.heading}>{title}</Text>
      {Object.entries(record)
        .filter(([key, value]) => labels[key] && value != null)
        .map(([key, value]) => (
          <Text key={key} style={styles.text}>
            {labels[key]}:{" "}
            {Array.isArray(value) ? value.join(", ") : String(value)}
          </Text>
        ))}
    </Card>
  ) : null;
}
export default function Account() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    allowed = useAuthStore((s) => s.roles.includes("ADMIN")),
    self = useAuthStore((s) => s.currentUser?.id === id);
  const [details, setDetails] = useState<AccountDetails | null>(null),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null),
    [reason, setReason] = useState(""),
    [confirm, setConfirm] = useState<
      "SUSPENDED" | "REINSTATED" | "GRANT" | "REVOKE" | null
    >(null),
    [reload, setReload] = useState(0),
    [notice, setNotice] = useState("");
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!allowed) return;
      setLoading(true);
      setError(null);
      accountAdminService
        .details(id)
        .then((v) => {
          if (active) setDetails(v);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [allowed, id, reload]),
  );
  async function apply() {
    if (!confirm) return;
    setBusy(true);
    setError(null);
    try {
      if (confirm === "GRANT" || confirm === "REVOKE")
        await accountAdminService.superuser(id, confirm === "GRANT");
      else await accountAdminService.moderate(id, confirm, reason);
      setDetails(await accountAdminService.details(id));
      setConfirm(null);
      setReason("");
      setNotice("Account updated.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to update this account.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!allowed)
    return (
      <Page title="Account details">
        <Text style={styles.text}>Super-user access required.</Text>
      </Page>
    );
  const admin = details?.account.roles.includes("ADMIN");
  return (
    <Page title="Account details">
      <Notice error={error} />
      {error ? (
        <Action
          title="Reload account"
          secondary
          onPress={() => setReload((n) => n + 1)}
        />
      ) : null}
      {loading ? (
        <Busy />
      ) : details ? (
        <>
          <Card>
            <Text style={styles.title}>{details.account.name}</Text>
            <Text style={styles.text}>{details.account.email}</Text>
            <Text style={styles.text}>{details.account.roles.join(" · ")}</Text>
            <Text style={styles.heading}>{details.account.status}</Text>
            {details.account.reason ? (
              <Text style={styles.error}>{details.account.reason}</Text>
            ) : null}
            <Text style={styles.text}>
              Joined {new Date(details.account.createdAt).toLocaleDateString()}
            </Text>
          </Card>
          <Details title="Player profile" record={details.player} />
          <Details title="Captain profile" record={details.captain} />
          <Details title="Hub profile" record={details.hub} />
          {details.hub ? (
            <Action
              title="View public venue"
              secondary
              onPress={() => router.push(`/hubs/${id}` as any)}
            />
          ) : null}
          <Card>
            <Text style={styles.heading}>Account controls</Text>
            {self ? (
              <Text style={styles.text}>
                You cannot suspend yourself or revoke your own super-user
                access.
              </Text>
            ) : (
              <>
                {!admin ? (
                  <Action
                    title={
                      details.account.status === "SUSPENDED"
                        ? "Reinstate account"
                        : "Suspend account"
                    }
                    danger={details.account.status !== "SUSPENDED"}
                    disabled={busy}
                    onPress={() => {
                      setNotice("");
                      setConfirm(
                        details.account.status === "SUSPENDED"
                          ? "REINSTATED"
                          : "SUSPENDED",
                      );
                    }}
                  />
                ) : (
                  <Text style={styles.text}>
                    Revoke super-user access before suspending this account.
                  </Text>
                )}
                <Action
                  title={
                    admin
                      ? "Revoke super-user access"
                      : "Grant super-user access"
                  }
                  secondary
                  disabled={busy || details.account.status === "SUSPENDED"}
                  onPress={() => {
                    setNotice("");
                    setConfirm(admin ? "REVOKE" : "GRANT");
                  }}
                />
              </>
            )}
          </Card>
          {confirm ? (
            <Card>
              <Text style={styles.heading}>
                Confirm{" "}
                {confirm === "GRANT"
                  ? "super-user grant"
                  : confirm === "REVOKE"
                    ? "super-user revocation"
                    : confirm === "SUSPENDED"
                      ? "suspension"
                      : "reinstatement"}
              </Text>
              <Text style={styles.text}>
                {confirm === "GRANT"
                  ? "This account will be able to manage all accounts and grant other super-users."
                  : confirm === "REVOKE"
                    ? "This removes administrative access while keeping the account and other capabilities."
                    : confirm === "SUSPENDED"
                      ? "Access will be blocked and public listings hidden. Match and chat history will be preserved."
                      : "The account will regain access and its listings will be visible again."}
              </Text>
              {confirm === "SUSPENDED" || confirm === "REINSTATED" ? (
                <FormInput
                  label="Reason (5–500 characters)"
                  multiline
                  value={reason}
                  onChangeText={setReason}
                />
              ) : null}
              <Action
                title={busy ? "Updating…" : "Confirm account change"}
                disabled={
                  busy ||
                  ((confirm === "SUSPENDED" || confirm === "REINSTATED") &&
                    reason.trim().length < 5)
                }
                danger
                onPress={apply}
              />
              <Action
                title="Cancel change"
                secondary
                disabled={busy}
                onPress={() => setConfirm(null)}
              />
            </Card>
          ) : null}
          {notice ? <Text style={styles.text}>{notice}</Text> : null}
          <Card>
            <Text style={styles.heading}>Moderation history</Text>
            {details.history.length ? (
              details.history.map((event, i) => (
                <Text key={event.id || i} style={styles.text}>
                  {event.action} ·{" "}
                  {new Date(event.created_at).toLocaleString("en-GB", {
                    timeZone: "Asia/Karachi",
                  })}{" "}
                  PKT{"\n"}
                  {event.reason}
                </Text>
              ))
            ) : (
              <Text style={styles.text}>No moderation actions recorded.</Text>
            )}
          </Card>
        </>
      ) : null}
    </Page>
  );
}
