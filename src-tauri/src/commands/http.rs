use std::collections::HashMap;
use tauri_plugin_http::reqwest;

#[derive(serde::Deserialize)]
pub struct FetchRequest {
    pub url: String,
    pub method: Option<String>,
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>,
}

#[derive(serde::Serialize)]
pub struct FetchResponse {
    pub status: u16,
    pub body: String,
}

#[tauri::command]
pub async fn widget_fetch(request: FetchRequest) -> Result<FetchResponse, String> {
    let client = reqwest::Client::new();
    let method = request.method.unwrap_or("GET".to_string());
    let mut req = client.request(
        reqwest::Method::from_bytes(method.as_bytes()).map_err(|e| e.to_string())?,
        &request.url,
    );
    if let Some(headers) = request.headers {
        for (k, v) in headers {
            req = req.header(&k, &v);
        }
    }
    if let Some(body) = request.body {
        req = req.body(body);
    }
    let res = req.send().await.map_err(|e| e.to_string())?;
    let status = res.status().as_u16();
    let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(FetchResponse { status, body })
}
