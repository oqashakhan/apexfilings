BEGIN;
CREATE SEQUENCE "apex_application_reference_seq" AS bigint START WITH 1 NO CYCLE;
CREATE FUNCTION apex_next_application_reference() RETURNS text
LANGUAGE plpgsql VOLATILE AS $$
DECLARE value text;
BEGIN
  value := nextval('apex_application_reference_seq')::text;
  RETURN 'APP-' || lpad(value, greatest(6, length(value)), '0');
END;
$$;
ALTER TABLE "Application" ADD COLUMN "reference" text;
UPDATE "Application" SET "reference"=apex_next_application_reference() WHERE "reference" IS NULL;
ALTER TABLE "Application" ALTER COLUMN "reference" SET DEFAULT apex_next_application_reference();
ALTER TABLE "Application" ALTER COLUMN "reference" SET NOT NULL;
ALTER TABLE "Application" ADD CONSTRAINT "Application_reference_format" CHECK ("reference" ~ '^APP-[0-9]{6,}$');
CREATE UNIQUE INDEX "Application_reference_key" ON "Application"("reference");
CREATE FUNCTION apex_protect_application_reference() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."reference" IS DISTINCT FROM OLD."reference" THEN
    RAISE EXCEPTION 'Application references are permanent';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "Application_reference_immutable" BEFORE UPDATE OF "reference" ON "Application"
FOR EACH ROW EXECUTE FUNCTION apex_protect_application_reference();
COMMIT;
