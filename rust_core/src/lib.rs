use napi_derive::napi;

#[napi]
pub fn say_hello(name: String) -> String {
    format!(
        "Hello, {}! Greetings from the Rust Engine Room (Via nodejs)",
        name,
    )
}
