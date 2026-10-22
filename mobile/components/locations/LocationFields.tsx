import React, { useEffect, useState } from "react";
import { Text, View, ScrollView } from "../theme/Primitives";
import { FormInput } from "../ui/FormInput";
import { Action, Choices, styles } from "../venues/VenueUI";
import { locationService, ServiceCity } from "../../services/locationService";
export function LocationFields({
  cityId,
  areaId,
  onChange,
  allowAll = false,
  onQueryChange,
  allowCustom = false,
  address = "",
}: {
  cityId: string;
  areaId: string;
  onChange: (cityId: string, areaId: string, label: string) => void;
  allowAll?: boolean;
  onQueryChange?: (query: string) => void;
  allowCustom?: boolean;
  address?: string;
}) {
  const [cities, setCities] = useState<ServiceCity[]>([]),
    [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    locationService
      .cities()
      .then((data) => {
        if (active) {
          setCities(data);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [retry]);
  const city = cities.find((c) => c.id === cityId),
    area = city?.areas.find((a) => a.id === areaId);
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const matches =
    city?.areas.filter((a) =>
      normalize([a.name, ...a.aliases].join(" ")).includes(normalize(query)),
    ) || [];
  return (
    <View style={{ gap: 12 }}>
      <Choices
        label="City"
        options={cities.map((c) => c.name)}
        value={city?.name || ""}
        onChange={(name) => {
          const next = cities.find((c) => c.name === name);
          if (next) {
            onChange(next.id, "", "");
            setQuery("");
            setOpen(false);
          }
        }}
      />
      <Text style={styles.text}>
        Currently serving {cities.map((c) => c.name).join(", ") || "Lahore"}.
      </Text>
      <FormInput
        label={
          allowAll
            ? "Search area"
            : allowCustom
              ? "Home address (required)"
              : "Home area (required)"
        }
        placeholder={
          allowCustom
            ? "Enter your address or choose an area"
            : "Search Gulberg, DHA, Johar Town…"
        }
        value={allowCustom ? address : open ? query : area?.name || ""}
        onFocus={() => {
          setQuery(allowCustom ? address : "");
          setOpen(true);
        }}
        onChangeText={(value) => {
          setQuery(value);
          setOpen(true);
          onQueryChange?.(value);
          onChange(cityId, "", allowCustom ? value : "");
        }}
      />
      {open ? (
        <View style={{ gap: 8 }}>
          {allowCustom && address.trim() ? (
            <Action
              title="Use this address"
              secondary
              onPress={() => setOpen(false)}
            />
          ) : null}
          {allowAll ? (
            <Action
              title="All areas"
              secondary
              onPress={() => {
                onChange(cityId, "", "");
                onQueryChange?.("");
                setOpen(false);
              }}
            />
          ) : null}
          <ScrollView
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 230 }}
            contentContainerStyle={{ gap: 8 }}
          >
            {matches.map((item) => (
              <Action
                key={item.id}
                title={item.name}
                secondary
                onPress={() => {
                  onChange(cityId, item.id, `${item.name}, ${city?.name}`);
                  onQueryChange?.("");
                  setOpen(false);
                }}
              />
            ))}
          </ScrollView>
          {!matches.length ? (
            <Text style={styles.text}>
              {allowCustom
                ? "Your typed address will be saved even if the area is not listed."
                : "No matching areas. Try another area name."}
            </Text>
          ) : null}
        </View>
      ) : null}
      {error ? (
        <>
          <Text style={styles.error}>{error}</Text>
          <Action
            title="Reload areas"
            secondary
            onPress={() => setRetry((n) => n + 1)}
          />
        </>
      ) : null}
    </View>
  );
}
