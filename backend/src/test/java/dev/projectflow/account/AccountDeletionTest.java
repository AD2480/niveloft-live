package dev.projectflow.account;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** Deleting your own account: the password is checked, the session ends, and the old sign-in stops working. */
@SpringBootTest
@AutoConfigureMockMvc
class AccountDeletionTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    private ResultActions postJson(String url, Object body, String token) throws Exception {
        var req = post(url).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        if (token != null) req = req.header("Authorization", "Bearer " + token);
        return mvc.perform(req);
    }

    @Test
    @DisplayName("wrong password is refused; the right one erases the account and ends its sessions")
    void deleteOwnAccount() throws Exception {
        String address = "delete.me@test.dev";
        String token = JsonPath.read(postJson("/api/auth/register",
                        Map.of("name", "Dee Leet", "email", address, "password", "Password123", "acceptTerms", true), null)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(), "$.data.token");

        postJson("/api/users/me/delete", Map.of("password", "WrongPass1"), token)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password").exists());

        postJson("/api/users/me/delete", Map.of("password", "Password123"), token).andExpect(status().isOk());

        // The session it was deleted from no longer works…
        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token)).andExpect(status().isUnauthorized());
        // …and neither does the old email and password.
        postJson("/api/auth/login", Map.of("email", address, "password", "Password123"), null).andExpect(status().isUnauthorized());
    }
}
