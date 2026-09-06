package com.antar.authservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "microservices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Microservice {

    @Id
    @Column(name = "service_key", nullable = false, length = 64)
    private String serviceKey;

    @Column(name = "display_name", nullable = false)
    private String displayName;

    @Column(name = "category", nullable = false)
    private String category;

    @Column(name = "description")
    private String description;
}
