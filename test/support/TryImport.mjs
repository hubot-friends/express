export default async name => {
  try {
    return await import(name)
  } catch (e) {
    return {}
  }
}
  