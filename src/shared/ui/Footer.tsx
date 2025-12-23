import LanguageDialog from "./LanguageDialog";

export default function Footer() {
  return (
    <footer className="fixed bottom-0 w-full p-2 flex flex-row z-10 pointer-events-none justify-start">
      <div className="pointer-events-auto">
        <LanguageDialog />
      </div>
    </footer>
  );
}
