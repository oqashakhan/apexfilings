BEGIN;

-- Internal User.id and every existing foreign key remain unchanged.
ALTER TABLE "User" ADD COLUMN "clientReference" TEXT;
CREATE UNIQUE INDEX "User_clientReference_key" ON "User"("clientReference");
CREATE TABLE "ClientReferenceHistory" (
  "userId" TEXT PRIMARY KEY,
  "previousReference" TEXT NOT NULL,
  "clientReference" TEXT NOT NULL UNIQUE CHECK ("clientReference" ~ '^[1-9][0-9]{8}$'),
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Reservation occurs inside the BEFORE INSERT trigger, before the User row exists.
  CONSTRAINT "ClientReferenceHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED
);

CREATE FUNCTION apex_client_reference_candidate() RETURNS TEXT
LANGUAGE plpgsql VOLATILE SET search_path = public AS $$
DECLARE bits BIGINT;
BEGIN
  LOOP
    -- The first 32 UUIDv4 bits are cryptographically random, with no version bits.
    bits := ('x' || substr(gen_random_uuid()::text, 1, 8))::bit(32)::bigint;
    -- Rejection sampling avoids modulo bias across the 900 million possible values.
    IF bits < 3600000000 THEN RETURN (100000000 + bits % 900000000)::text; END IF;
  END LOOP;
END;
$$;

CREATE FUNCTION apex_assign_client_reference() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE candidate TEXT; reserved TEXT; attempt INTEGER; previous TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD."clientReference" ~ '^[1-9][0-9]{8}$' AND NEW."clientReference" IS DISTINCT FROM OLD."clientReference" THEN
      RAISE EXCEPTION 'Client reference numbers are permanent' USING ERRCODE = '23514';
    END IF;
    previous := COALESCE(OLD."clientReference", OLD.id);
  ELSE
    IF NEW."clientReference" IS NOT NULL THEN
      RAISE EXCEPTION 'Client reference numbers are assigned automatically' USING ERRCODE = '23514';
    END IF;
    previous := NEW.id;
  END IF;
  IF NEW.role <> 'CLIENT' THEN RETURN NEW; END IF;
  SELECT "clientReference" INTO reserved FROM "ClientReferenceHistory" WHERE "userId" = NEW.id;
  IF reserved IS NOT NULL THEN NEW."clientReference" := reserved; RETURN NEW; END IF;

  FOR attempt IN 1..100 LOOP
    -- Preserve an already valid reference when repairing/backfilling a staged record.
    candidate := CASE WHEN attempt = 1 AND NEW."clientReference" ~ '^[1-9][0-9]{8}$'
      THEN NEW."clientReference" ELSE apex_client_reference_candidate() END;
    -- The unique insert is the reservation, not a check-then-insert race.
    INSERT INTO "ClientReferenceHistory" ("userId", "previousReference", "clientReference")
      VALUES (NEW.id, previous, candidate) ON CONFLICT ("clientReference") DO NOTHING
      RETURNING "clientReference" INTO reserved;
    IF reserved IS NOT NULL THEN NEW."clientReference" := reserved; RETURN NEW; END IF;
  END LOOP;
  RAISE EXCEPTION 'Could not allocate a unique client reference; retry the transaction' USING ERRCODE = '54000';
END;
$$;

CREATE TRIGGER "User_assign_client_reference"
BEFORE INSERT OR UPDATE OF "clientReference", role ON "User"
FOR EACH ROW EXECUTE FUNCTION apex_assign_client_reference();

CREATE FUNCTION apex_backfill_client_references() RETURNS INTEGER
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE changed INTEGER;
BEGIN
  -- Reserve valid staged numbers first so a new allocation cannot take one.
  INSERT INTO "ClientReferenceHistory" ("userId", "previousReference", "clientReference")
    SELECT id, COALESCE("clientReference", id), CASE WHEN "clientReference" ~ '^[1-9][0-9]{8}$' THEN "clientReference" ELSE id END FROM "User"
    WHERE role = 'CLIENT' AND ("clientReference" ~ '^[1-9][0-9]{8}$' OR ("clientReference" IS NULL AND id ~ '^[1-9][0-9]{8}$'))
    ON CONFLICT DO NOTHING;
  UPDATE "User" SET "clientReference" = "clientReference"
    WHERE role = 'CLIENT' AND ("clientReference" IS NULL OR "clientReference" !~ '^[1-9][0-9]{8}$');
  GET DIAGNOSTICS changed = ROW_COUNT;
  RETURN changed;
END;
$$;

-- The initial backfill is atomic with the schema/trigger installation.
SELECT apex_backfill_client_references();
ALTER TABLE "User" ADD CONSTRAINT "User_clientReference_format"
  CHECK (("clientReference" IS NULL OR "clientReference" ~ '^[1-9][0-9]{8}$') AND (role <> 'CLIENT' OR "clientReference" IS NOT NULL));

COMMIT;
