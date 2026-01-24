// Tag Groups - when user selects any tag in a group, consider ALL tags in that group
const TAG_GROUPS: Record<string, number[]> = {
  // ============ ALGORITHMS & TECHNIQUES ============
  
  "Dynamic Programming": [26, 27, 28, 29, 30, 31, 82, 145, 184, 218, 237, 239, 276, 284, 287, 288, 297, 408, 804, 966, 974, 1005],
  // dp, DP on Arrays, DP on Trees, DP on Strings, Knapsack, Bitmask DP, dynamic-programming, advanced dp, sos dp, dp approach, bottom-up, top-down, 0-1 knapsack, dp on sequences, longest increasing subsequence, digit dp, dp bitmask, longest-com-subsequence, dp-on-trees, dp-bitmask, digit-dp
  
  "Greedy": [12, 556],
  // Greedy, activity selection
  
  "Binary Search": [9, 10, 194, 256],
  // Binary Search, Ternary Search, binary-search, binary search on answer
  
  "Two Pointers & Sliding Window": [7, 8, 63, 343, 591],
  // Sliding Window, Two Pointers, Sliding Window Optimization, two-pointers, sliding-window
  
  "Divide and Conquer": [66],
  
  "Backtracking & Recursion": [24, 25, 513],
  // Recursion, Backtracking, pruning
  
  "Brute Force": [78, 191, 382],
  // Brute Force, brute-force, complete search
  
  "Meet in the Middle": [62, 103, 538],
  // Meet in the Middle, meet-in-the-middle, meet-in-middle
  
  // ============ DATA STRUCTURES ============
  
  "Arrays": [1, 182, 183, 243, 567],
  // Array, arrays, 2d arrays, 1d arrays, 3d+ arrays
  
  "Strings": [2, 69, 70, 71, 72, 73, 74, 75, 87, 100, 315, 317, 318, 380, 497, 499, 528, 600, 680, 722, 723, 835, 851, 893, 935, 969, 1001, 1041, 1059, 1065],
  // String, String Matching, KMP, Z Algorithm, Rabin Karp, Suffix Array, Suffix Tree, Rolling Hash, strings, string suffix structures, suffix structures, kmp algorithm, suffix arrays, palindrome, string parsing, suffix trees, substring, string algos, aho corasick, rabin karp algorithm, z-algorithm, suffix automaton, string-parsing, longest common prefix, suffix-array, longest-common-prefix, manachers algorithm, longest common substring, longest common subsequence
  
  "Linked List": [21, 122],
  // Linked List, doubly-linked list
  
  "Stack & Queue": [16, 17, 18, 19, 20, 255, 327, 413],
  // Stack, Queue, Deque, Monotonic Stack, Monotonic Queue, queues, stacks, next greater element
  
  "Heap & Priority Queue": [22, 23, 115, 443, 620],
  // Heap, Priority Queue, heap (priority queue), heaps, priority-queue
  
  "Hash & Set & Map": [13, 14, 15, 106, 121, 244, 245, 247, 711],
  // Hashing, Map, Set, hash table, ordered set, hashmaps, sets, maps, unordered sets
  
  "Tree Structures": [33, 34, 35, 48, 84, 157, 172, 299, 648, 789, 817, 841],
  // Tree, Binary Tree, Binary Search Tree, Trie, trees, advanced tree structures, tries, tries with xor, tree data structure, treap, splay tree, balanced binary search tree
  
  "Segment & Fenwick Tree": [49, 50, 51, 154, 171, 226, 295, 402, 428, 540, 904, 1011],
  // Segment Tree, Fenwick Tree, Binary Indexed Tree, fenwick trees, segment trees, lazy propagation, range minimum queries, fenwick-tree, segment-tree, range sum queries, range-queries, merge sort tree
  
  "Sparse Table & Range Queries": [52, 53, 65, 253, 377, 485, 867, 878],
  // Sparse Table, Range Queries, Mo's Algorithm, queries, square root decomposition, online queries, sqrt-decomp, square-root-decomposition
  
  "Union Find / DSU": [46, 47, 85, 358, 791],
  // Union Find, Disjoint Set Union, dsu, union-find, disjoint-set-union
  
  "Advanced Data Structures": [161, 458, 466, 830, 831, 842, 899, 925, 957, 999, 1000, 1066],
  // advanced data structures, policy based data structures, data-structure, persistent structures, persistent segment trees, range trees, persistence, link-cut-tree, link cut tree, persistent-segment-tree, functional structures, persistent tries
  
  // ============ GRAPH ALGORITHMS ============
  
  "Graph Basics": [32, 36, 37, 90, 91, 159, 205, 390, 391, 407, 417, 489, 523, 900],
  // Graph, DFS, BFS, graphs, dfs and similar, traversals, connected components, directed-graph, cycle_graph, bipartite, cycles, directed acyclic graphs, bipartite graphs, dag
  
  "Shortest Path": [38, 39, 40, 41, 95, 251, 277, 282, 283, 308, 319, 381],
  // Shortest Path, Dijkstra, Bellman Ford, Floyd Warshall, shortest paths, shortest-path, bellman-ford algorithm, dijkstra's algorithm, floyd warshall's algorithm, dijkstra-algorithm, 0-1 bfs, floyd-warshall
  
  "Minimum Spanning Tree": [42, 43, 44, 207, 316, 585, 857, 1052],
  // Minimum Spanning Tree, Kruskal, Prim, minimum spanning trees, kruskal's algorithm, prim's algorithm, spanning-tree, minimum-spanning-tree
  
  "Topological Sort": [45, 258, 259, 346],
  // Topological Sort, dag algos, directed graphs, topological sorting
  
  "Strongly Connected Components": [131, 206, 257, 260, 129, 845, 921],
  // strongly connected component, bridges, strongly connected components, kosaraju's algorithm, biconnected component, biconnected components, articulation points
  
  "Tree Algorithms (LCA, HLD, etc)": [160, 162, 176, 208, 289, 313, 374, 385, 400, 437, 769, 877, 983, 984, 1038, 1039, 1060],
  // lowest common ancestor, binary lifting, rerooting, tree algos, centroid decomposition, dsu on trees, lowest-common-ancestor, auxiliary tree, eulerian-tour, binary-lifting, hld, heavy-light-decomposition, dfs-order, dfs order, rooted-trees, treeroot, jump pointers
  
  "Flow & Matching": [99, 490, 491, 492, 493, 594, 809, 810, 860, 861, 884, 889, 894, 977, 1009],
  // flows, maximum flow, ford-fulkerson algorithm, flow networks, coverings, maximum bipartite matching, maximum-flow, maximum-independent-set, min cost max flow, linear programming, edge cover, min cut max flow, matching, minimum-cut, vertex cover
  
  // ============ MATH & NUMBER THEORY ============
  
  "Basic Math": [3, 163, 165, 238, 248, 353, 419, 420, 541, 671, 681, 685, 696, 736],
  // Math, mathematics, basic math, arithmetic, algebra, maths, areas, data types, logarithm, fractions, integer division, discrete maths, divisibility, logic-maths
  
  "Number Theory": [55, 56, 57, 58, 195, 222, 227, 228, 229, 230, 249, 266, 267, 271, 314, 352, 461, 459, 482, 507, 512, 566, 637, 638, 672, 692, 693, 729, 776, 910, 911, 912, 972, 988, 989, 1008, 1048],
  // Number Theory, GCD, LCM, Prime Sieve, modular arithmetic, euler-totient-function, integer factorisation, divisors, prime divisors, sieve of eratosthenes, euler totient function, modulo multiplicative inverse, modular exponentiation, factorization, euclid's algorithm, fermat's little theorem, primes, sieve, greatest-common-divisor, bezout's identity, number-theory, catalan numbers, primality checking, rabin miller test, sqrt n primality check, sieve-of-eratosthenes, prime-factorization, segmented sieve, modulo, primitive root, mobius inversion, mobius function, lucas theorem, carmichael-function, euler-theorem, discrete logarithm
  
  "Combinatorics & Probability": [59, 60, 94, 130, 174, 197, 212, 250, 355, 359, 427, 456, 577, 917],
  // Combinatorics, Probability, probabilities, probability and statistics, expected value, factorials, inclusion exclusion principle, binomial theorem, inclusion-exclusion, permutations & combinations, derangements, pigeonhole principle, expected-value, binomial-theorem
  
  "Geometry": [61, 166, 200, 268, 269, 442, 562, 563, 590, 593, 601, 783, 849, 906, 916, 928, 929, 931, 940, 964, 1044],
  // Geometry, computational geometry, trigonometry, polygons, triangles, cartesian coordinate system, intersection, cross product, convex hull, squares, convex-hull, manhattan, scanline, rotating caliper, greens-theorem, line-sweep, line-clipping, polygon kernel, persistent convex hull, convex-polygon, manhattan distance
  
  "Matrix": [67, 68, 97, 335, 337, 519, 619, 807, 922, 927, 946, 953, 992, 993, 994, 1055],
  // Matrix, Matrix Exponentiation, matrices, matrix-exponentiation, matrix multiplication, determinant, linear algebra, linear-algebra, gaussian elimination, matrix-multiplication, cayley-hamilton, gaussian-elimination, hadamard-matrix, sylvesters-criterion, paley-construction, cayley hamilton theorem
  
  // ============ BIT MANIPULATION ============
  
  "Bit Manipulation": [4, 86, 128, 196, 235, 242, 448, 558, 605, 699],
  // Bit Manipulation, bitmasks, bitmask, bitwise operation, bitmasking, bitwise-operation, xor, bitwise-xor, bit-manipulation, bitwise-and
  
  // ============ ADVANCED ALGORITHMS ============
  
  "FFT & Convolution": [102, 204, 321, 376, 455, 828, 918, 962, 965, 975],
  // fft, number-theoretic-transfmtn, polynomial, convolution, ntt, fast-fourier-transform, karatsuba-algorithm, fast walsh hadamard transform, walsh-hadamard, fast-walsh-hadamard-transform
  
  "Game Theory": [54, 92, 285, 291, 292, 294, 386, 951],
  // Game Theory, games, sprague grundy theorem, sprague-grundy, grundy-numbers, game-theory, nim game, hackenbush
  
  "Interactive": [76, 167],
  // Interactive, interactive problems
  
  "2-SAT": [96, 441],
  // 2-sat, 2 sat
  
  // ============ IMPLEMENTATION & DIFFICULTY ============
  
  "Implementation": [77, 79, 173, 232, 468, 472, 476, 686, 803],
  // Implementation, Simulation, ad-hoc, case work, pattern, logicalthinking, simple, patterns, construction
  
  "Constructive": [80, 139, 803],
  // Constructive Algorithms, constructive, construction
  
  // ============ PREFIX/SUFFIX/DIFFERENCE ============
  
  "Prefix & Difference Arrays": [5, 6, 310, 395, 403, 478],
  // Prefix Sum, Difference Array, prefix-sum, difference arrays, difference-array, suffix sum
  
  // ============ SEQUENCES & PERMUTATIONS ============
  
  "Sequences & Permutations": [214, 265, 287, 288, 301, 302, 320, 361, 451, 531, 633, 762, 764, 786, 1057],
  // subsequence, permutations, dp on sequences, longest increasing subsequence, permutation, inversions, lexicographic order, permutation cycles, subarray, fibonacci series, cyclic rotation, sequence, partitions, hard, arithmetic-progression
  
  // ============ SORTING ============
  
  "Sorting": [11, 81, 116, 117, 123, 125, 132, 133, 135],
  // Sorting, sortings, counting sort, hash function, merge sort, bucket sort, sort, radix sort, quickselect
  
  // ============ COORDINATE COMPRESSION ============
  
  "Coordinate Compression": [64, 404],
  // Coordinate Compression, coordinate-compression
  
  // ============ PLATFORMS ============
  
  "Platforms": [104, 105, 345],
  // CodeChef, leetcode, atcoder
  
  // ============ DIFFICULTY LEVELS ============
  
  "Difficulty": [140, 141, 263, 332, 662, 785, 896, 1031],
  // easy-medium, medium, med-hard, easy, cakewalk, hard, super-hard, med-hard
  
  // ============ OTHERS (Weird/Contest/Author tags) ============
  // All contest tags (start*, cook*, ltime*, etc.) and author tags go here
  "Others": [88, 89, 93, 98, 101, 107, 108, 109, 110, 111, 112, 113, 114, 118, 119, 120, 124, 126, 127, 134, 136, 137, 138, 142, 143, 144, 146, 147, 148, 149, 150, 151, 152, 153, 155, 156, 158, 164, 168, 169, 170, 175, 177, 178, 179, 180, 181, 185, 186, 187, 188, 189, 190, 192, 193, 198, 199, 201, 202, 203, 209, 210, 211, 213, 215, 216, 217, 219, 220, 221, 223, 224, 225, 231, 233, 234, 236, 240, 241, 246, 252, 254, 261, 262, 264, 270, 272, 273, 274, 275, 278, 279, 280, 281, 290, 293, 296, 298, 300, 303, 304, 305, 306, 307, 309, 311, 312, 322, 323, 324, 325, 326, 328, 329, 330, 331, 333, 334, 336, 338, 339, 340, 341, 342, 344, 347, 348, 349, 350, 351, 354, 356, 357, 360, 362, 363, 364, 365, 366, 367, 368, 369, 370, 371, 372, 373, 375, 378, 379, 383, 384, 387, 388, 389, 392, 393, 394, 396, 397, 398, 399, 401, 405, 406, 409, 410, 411, 412, 414, 415, 416, 418, 421, 422, 423, 424, 425, 426, 429, 430, 431, 432, 433, 434, 435, 436, 438, 439, 440, 444, 445, 446, 447, 449, 450, 452, 453, 454, 457, 460, 462, 463, 464, 465, 467, 469, 470, 471, 473, 474, 475, 477, 479, 480, 481, 483, 484, 486, 487, 488, 494, 495, 496, 498, 500, 501, 502, 503, 504, 505, 506, 508, 509, 510, 511, 514, 515, 516, 517, 518, 520, 521, 522, 524, 525, 526, 527, 529, 530, 532, 533, 534, 535, 536, 537, 539, 542, 543, 544, 545, 546, 547, 548, 549, 550, 551, 552, 553, 554, 555, 557, 559, 560, 561, 564, 565, 568, 569, 570, 571, 572, 573, 574, 575, 576, 578, 579, 580, 581, 582, 583, 584, 586, 587, 588, 589, 592, 595, 596, 597, 598, 599, 602, 603, 604, 606, 607, 608, 609, 610, 611, 612, 613, 614, 615, 616, 617, 618, 621, 622, 623, 624, 625, 626, 627, 628, 629, 630, 631, 632, 634, 635, 636, 639, 640, 641, 642, 643, 644, 645, 646, 647, 649, 650, 651, 652, 653, 654, 655, 656, 657, 658, 659, 660, 661, 663, 664, 665, 666, 667, 668, 669, 670, 673, 674, 675, 676, 677, 678, 679, 682, 683, 684, 687, 688, 689, 690, 691, 694, 695, 697, 698, 700, 701, 702, 703, 704, 705, 706, 707, 708, 709, 710, 712, 713, 714, 715, 716, 717, 718, 719, 720, 721, 724, 725, 726, 727, 728, 730, 731, 732, 733, 734, 735, 737, 738, 739, 740, 741, 742, 743, 744, 745, 746, 747, 748, 749, 750, 751, 752, 753, 754, 755, 756, 757, 758, 759, 760, 761, 763, 765, 766, 767, 768, 770, 771, 772, 773, 774, 775, 777, 778, 779, 780, 781, 782, 784, 787, 788, 790, 792, 793, 794, 795, 796, 797, 798, 799, 800, 801, 802, 805, 806, 808, 811, 812, 813, 814, 815, 816, 818, 819, 820, 821, 822, 823, 824, 825, 826, 827, 829, 832, 833, 834, 836, 837, 838, 839, 840, 843, 844, 846, 847, 848, 850, 852, 853, 854, 855, 856, 858, 859, 862, 863, 864, 865, 866, 868, 869, 870, 871, 872, 873, 874, 875, 876, 879, 880, 881, 882, 883, 885, 886, 887, 888, 890, 891, 892, 895, 897, 898, 901, 902, 903, 905, 907, 908, 909, 913, 914, 915, 919, 920, 923, 924, 926, 930, 932, 933, 934, 936, 937, 938, 939, 941, 942, 943, 944, 945, 947, 948, 949, 950, 952, 954, 955, 956, 958, 959, 960, 961, 963, 967, 968, 970, 971, 973, 976, 978, 979, 980, 981, 982, 985, 986, 987, 990, 991, 995, 996, 997, 998, 1002, 1003, 1004, 1006, 1007, 1010, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020, 1021, 1022, 1023, 1024, 1025, 1026, 1027, 1028, 1029, 1030, 1032, 1033, 1034, 1035, 1036, 1037, 1040, 1042, 1043, 1045, 1046, 1047, 1049, 1050, 1051, 1053, 1054, 1056, 1058, 1061, 1062, 1063, 1064, 1067, 1068, 1069]
};
