"use client";

import { useState } from "react";
import { LuGift, LuPartyPopper, LuTrash2 } from "react-icons/lu";

import {
  Button,
  Checkbox,
  Confetti,
  Field,
  Input,
  Modal,
  RadioCard,
  SegmentedControl,
  Select,
  Textarea,
  useToast,
} from "@/components/ui";

export function FormPlayground() {
  const [amount, setAmount] = useState("120");
  const [delivery, setDelivery] = useState("easybox");
  const [category, setCategory] = useState<"moda" | "sport" | "arta">("sport");

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Field
          label="Titlul anunțului"
          hint="Spune clar ce vinzi. Titlurile bune primesc cu 40% mai multe oferte."
          required
        >
          <Input placeholder="ex. Bicicletă de oraș, cadru aluminiu" />
        </Field>
        <Field label="Preț de pornire" required>
          <Input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            trailing="lei"
          />
        </Field>
        <Field
          label="Procent donat"
          error="Alege un procent între 5 și 100."
          required
        >
          <Input defaultValue="120" inputMode="numeric" trailing="%" />
        </Field>
        <Field label="Categorie">
          <Select
            ariaLabel="Categorie"
            value={category}
            onChange={(next) => setCategory(next as typeof category)}
            options={[
              { value: "moda", label: "Modă", prefix: "👗" },
              { value: "sport", label: "Sport & Outdoor", prefix: "⚽" },
              { value: "arta", label: "Artă & Handmade", prefix: "🎨" },
            ]}
          />
        </Field>
      </div>
      <div className="flex flex-col gap-4">
        <Field label="Descriere" hint="Menționează starea, defectele și accesoriile.">
          <Textarea placeholder="Povestește-ne despre produs..." rows={5} />
        </Field>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 font-display text-sm font-bold text-ink-800">
            Metodă de livrare
          </legend>
          <RadioCard
            name="delivery"
            label="Easybox"
            description="Ridici din locker, non-stop. 14,99 lei"
            icon="📦"
            checked={delivery === "easybox"}
            onChange={() => setDelivery("easybox")}
          />
          <RadioCard
            name="delivery"
            label="Curier la adresă"
            description="Livrare la ușă în 1-2 zile. 22,99 lei"
            icon="🚚"
            checked={delivery === "curier"}
            onChange={() => setDelivery("curier")}
          />
        </fieldset>
        <Checkbox
          label="Sunt de acord cu termenii bid4"
          description="Inclusiv politica de escrow și de returnare."
          defaultChecked
        />
        <Checkbox label="Opțiune dezactivată" disabled />
      </div>
    </div>
  );
}

export function SegmentedDemo() {
  const [tab, setTab] = useState<"toate" | "active" | "castigate">("active");
  return (
    <SegmentedControl
      ariaLabel="Filtrează licitațiile"
      value={tab}
      onChange={setTab}
      options={[
        { value: "toate", label: "Toate", count: 24 },
        { value: "active", label: "Active", count: 6 },
        { value: "castigate", label: "Câștigate", count: 2 },
      ]}
    />
  );
}

export function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Deschide dialogul
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Retrage anunțul?"
        description="Licitația are deja 4 oferte plasate."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Păstrează anunțul
            </Button>
            <Button
              variant="danger"
              leftIcon={<LuTrash2 aria-hidden="true" className="h-4 w-4" />}
              onClick={() => setOpen(false)}
            >
              Retrage
            </Button>
          </>
        }
      >
        <p className="text-ink-700">
          Dacă retragi anunțul acum, ofertanții vor fi anunțați, iar cauza{" "}
          <strong className="font-bold">Împreună pentru Ana</strong> nu va primi
          donația estimată.
        </p>
      </Modal>
    </>
  );
}

export function ConfettiDemo() {
  const [trigger, setTrigger] = useState(0);
  return (
    <>
      <Button
        variant="accent"
        leftIcon={<LuPartyPopper aria-hidden="true" className="h-5 w-5" />}
        onClick={() => setTrigger((value) => value + 1)}
      >
        Sărbătorește o victorie
      </Button>
      {trigger > 0 ? <Confetti trigger={trigger} /> : null}
    </>
  );
}

export function ButtonStatesDemo() {
  const [loading, setLoading] = useState(false);
  return (
    <Button
      variant="primary"
      loading={loading}
      leftIcon={<LuGift aria-hidden="true" className="h-5 w-5" />}
      onClick={() => {
        setLoading(true);
        window.setTimeout(() => setLoading(false), 1800);
      }}
    >
      {loading ? "Se plasează oferta..." : "Licitează 125 lei"}
    </Button>
  );
}

export function ToastDemo() {
  const { success, error, info, toast } = useToast();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          success("Ofertă plasată!", "Ești cel mai bun ofertant cu 125,00 lei.")
        }
      >
        Succes
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          error("Plata a fost refuzată", "Banca a respins tranzacția.")
        }
      >
        Eroare
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => info("Ai fost depășit", "Cineva a licitat 130,00 lei.")}
      >
        Info
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          toast({
            title: "Comandă confirmată",
            description: "Eticheta de expediere a fost generată.",
            tone: "primary",
            action: { label: "Vezi comanda", onClick: () => undefined },
          })
        }
      >
        Cu acțiune
      </Button>
    </div>
  );
}
