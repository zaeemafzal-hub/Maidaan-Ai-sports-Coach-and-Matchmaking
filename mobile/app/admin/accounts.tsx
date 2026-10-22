import React, { useCallback, useState } from "react";
import { Text, View } from "../../components/theme/Primitives";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuthStore } from "../../store/useAuthStore";
import {
  accountAdminService,
  ManagedAccount,
} from "../../services/accountAdminService";
import { FormInput } from "../../components/ui/FormInput";
import {
  Page,
  Card,
  Action,
  Choices,
  Notice,
  Busy,
  styles,
} from "../../components/venues/VenueUI";
export default function Accounts() {
  const params = useLocalSearchParams<{ role?: string }>(),
    allowed = useAuthStore((s) => s.roles.includes("ADMIN"));
  const [search, setSearch] = useState(""),
    [term, setTerm] = useState(""),
    [role, setRole] = useState(params.role || "ALL"),
    [status, setStatus] = useState("ALL"),
    [page, setPage] = useState(0),
    [total, setTotal] = useState(0),
    [accounts, setAccounts] = useState<ManagedAccount[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null),
    [reload, setReload] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!allowed) return;
      setLoading(true);
      setError(null);
      accountAdminService
        .list(term, role, status, page)
        .then((result) => {
          if (active) {
            setAccounts(result.accounts);
            setTotal(result.total);
          }
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
    }, [allowed, term, role, status, page, reload]),
  );
  if (!allowed)
    return (
      <Page title="Accounts">
        <Text style={styles.text}>
          Super-user access required. Sign in with an authorized account.
        </Text>
        <Action title="Sign in" onPress={() => router.push("/(auth)/login")} />
      </Page>
    );
  return (
    <Page title="Accounts & super-users">
      <Text style={styles.title}>Manage the Maidaan community.</Text>
      <Text style={styles.text}>
        Suspensions block access and hide listings while preserving history.
        Super-user access can be granted or revoked for existing active
        accounts.
      </Text>
      <FormInput
        label="Search name or email"
        value={search}
        onChangeText={setSearch}
      />
      <Action
        title="Search accounts"
        onPress={() => {
          setTerm(search.trim());
          setPage(0);
          setReload((n) => n + 1);
        }}
      />
      <Choices
        label="Account capability"
        options={["ALL", "PLAYER", "TEAM_CAPTAIN", "HUB_OWNER", "ADMIN"]}
        value={role}
        onChange={(v) => {
          setRole(v);
          setPage(0);
        }}
      />
      <Choices
        label="Account status"
        options={["ALL", "ACTIVE", "SUSPENDED"]}
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(0);
        }}
      />
      <Notice error={error} />
      {error ? (
        <Action
          title="Retry accounts"
          secondary
          onPress={() => setReload((n) => n + 1)}
        />
      ) : null}
      {loading ? (
        <Busy />
      ) : !error ? (
        <>
          <Text style={styles.text}>
            {total} accounts · Page {page + 1}
          </Text>
          {!accounts.length ? (
            <Text style={styles.text}>No matching accounts.</Text>
          ) : null}
          {accounts.map((account) => (
            <Card key={account.id}>
              <Text style={styles.heading}>{account.name}</Text>
              <Text style={styles.text}>{account.email}</Text>
              <Text style={styles.text}>
                {account.roles.join(" · ")} · {account.status}
              </Text>
              {account.reason ? (
                <Text style={styles.error}>{account.reason}</Text>
              ) : null}
              <Action
                title={`Manage ${account.name}`}
                secondary
                onPress={() =>
                  router.push(`/admin/account/${account.id}` as any)
                }
              />
            </Card>
          ))}
          <View style={styles.row}>
            <Action
              title="Previous page"
              secondary
              disabled={!page}
              onPress={() => setPage((n) => n - 1)}
            />
            <Action
              title="Next page"
              secondary
              disabled={(page + 1) * 30 >= total}
              onPress={() => setPage((n) => n + 1)}
            />
          </View>
        </>
      ) : null}
    </Page>
  );
}
