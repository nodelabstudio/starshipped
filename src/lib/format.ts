export function registry(id: number) {
  return `SS-${String(id).padStart(3, "0")}`;
}

export function credits(amount: number) {
  return `${amount.toLocaleString("en-US")} CR`;
}
