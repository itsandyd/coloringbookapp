CREATE TABLE "drawings" (
	"id" serial PRIMARY KEY NOT NULL,
	"image_id" text NOT NULL,
	"lines" json NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "images" (
	"id" serial PRIMARY KEY NOT NULL,
	"uuid" text NOT NULL,
	"prompt" text NOT NULL,
	"image_url" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "images_uuid_unique" UNIQUE("uuid")
);
--> statement-breakpoint
ALTER TABLE "drawings" ADD CONSTRAINT "drawings_image_id_images_uuid_fk" FOREIGN KEY ("image_id") REFERENCES "public"."images"("uuid") ON DELETE no action ON UPDATE no action;