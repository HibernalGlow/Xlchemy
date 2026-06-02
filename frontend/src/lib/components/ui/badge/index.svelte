<script lang="ts">
  import { cn } from "$lib/utils";
  import { cva, type VariantProps } from "class-variance-authority";

  const badgeVariants = cva(
    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
      variants: {
        variant: {
          default: "border-transparent bg-primary text-primary-foreground",
          secondary: "border-transparent bg-secondary text-secondary-foreground",
          destructive: "border-transparent bg-destructive text-white",
          outline: "text-foreground",
        },
      },
      defaultVariants: { variant: "default" },
    }
  );

  interface Props {
    class?: string;
    variant?: VariantProps<typeof badgeVariants>["variant"];
    children: import("svelte").Snippet;
  }
  let { class: className = "", variant = "default", children }: Props = $props();
</script>

<span class={cn(badgeVariants({ variant }), className)}>
  {@render children()}
</span>
